/* js/settings.js */
(async function(){
  requireAuth();
  let settings={}, rates=[], cats=[];

  try{
    settings = await Store.getSettings();
    rates = await Store.getRates();
    cats = await Store.getCategories();
  }catch(e){ toast('Gagal memuat pengaturan: '+e.message, false); }

  $('#businessName').value = settings.businessName||'';
  $('#ownerName').value = settings.ownerName||'';
  $('#defaultCurrency').value = settings.defaultCurrency||'IDR';

  renderRates(); renderCats();

  function renderRates(){
    $('#rates').innerHTML = rates.map(function(r){
      const dis = r.currency==='IDR' ? 'readonly style="opacity:.6"' : '';
      return '<label class="fld">'+(CURRENCY_FLAGS[r.currency]||'')+' '+r.currency+'</label>'
        +'<div class="input"><span class="ms">currency_exchange</span><input class="num rate-inp" data-cur="'+r.currency+'" value="'+r.rate+'" inputmode="numeric" '+dis+'></div>';
    }).join('');
  }

  function renderCats(){
    $('#cats').innerHTML = cats.map(function(c){
      const col = c.type==='income'?'var(--green)':'var(--red)';
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--line)">'
        +'<span style="width:7px;height:7px;border-radius:50%;background:'+col+'"></span>'
        +'<span style="flex:1;font-size:13px;font-weight:600">'+c.name+'</span>'
        +'<span class="muted" style="font-size:11px">'+(c.type==='income'?'Income':'Expense')+'</span>'
        +'<button class="del-cat icon-btn" data-id="'+c.id+'" style="width:30px;height:30px;background:transparent;border:none"><span class="ms" style="font-size:18px;color:var(--red)">delete</span></button>'
        +'</div>';
    }).join('');
    $all('.del-cat').forEach(function(b){
      b.addEventListener('click', async function(){
        await Store.deleteCategory(b.dataset.id);
        cats = cats.filter(function(c){ return c.id!==b.dataset.id; });
        renderCats(); toast('Kategori dihapus', true);
      });
    });
  }

  // ---------- tambah kategori (modal) ----------
  let catType='income';
  function openCatModal(){ $('#cat-name').value=''; catType='income'; $all('#cat-type button').forEach(function(b){ b.classList.toggle('active', b.dataset.t==='income'); }); $('#cat-backdrop').classList.remove('hidden'); setTimeout(function(){ $('#cat-name').focus(); },50); }
  function closeCatModal(){ $('#cat-backdrop').classList.add('hidden'); }
  $('#add-cat').addEventListener('click', openCatModal);
  $('#cat-close').addEventListener('click', closeCatModal);
  $('#cat-backdrop').addEventListener('click', function(e){ if(e.target===$('#cat-backdrop')) closeCatModal(); });
  $all('#cat-type button').forEach(function(b){ b.addEventListener('click', function(){ catType=b.dataset.t; $all('#cat-type button').forEach(function(x){ x.classList.toggle('active', x===b); }); }); });
  $('#cat-save').addEventListener('click', async function(){
    const name=$('#cat-name').value.trim();
    if(!name){ toast('Nama kategori wajib diisi', false); return; }
    if(cats.some(function(c){ return c.type===catType && c.name.toLowerCase()===name.toLowerCase(); })){ toast('Kategori sudah ada', false); return; }
    try{ const row = await Store.addCategory({ type:catType, name:name }); cats.push(row); renderCats(); closeCatModal(); toast('Kategori ditambahkan', true); }
    catch(e){ toast(e.message||'Gagal menambah kategori', false); }
  });

  $('#save').addEventListener('click', async function(){
    const obj = {
      businessName:$('#businessName').value, ownerName:$('#ownerName').value,
      defaultCurrency:$('#defaultCurrency').value
    };
    $('#save').disabled=true;
    try{
      await Store.saveSettings(obj);
      // simpan kurs (via Store: sinkron ke server bila online, antre bila offline, lokal bila demo)
      for(const inp of $all('.rate-inp')){
        const cur=inp.dataset.cur, rate=parseFloat(String(inp.value).replace(/[^\d.]/g,''))||1;
        if(cur!=='IDR') await Store.saveRate(cur, rate);
      }
      toast('Pengaturan tersimpan', true);
    }catch(e){ toast(e.message||'Gagal menyimpan', false); }
    finally{ $('#save').disabled=false; }
  });

  // backup / restore (localStorage)
  $('#backup').addEventListener('click', function(){
    const dump={}; ['users','txns','cats','settings','rates'].forEach(function(k){ dump[k]=localStorage.getItem('fdq_'+k); });
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-fdq-'+todayStr()+'.json'; a.click(); URL.revokeObjectURL(a.href);
    toast('Backup diunduh', true);
  });
  $('#restore').addEventListener('click', function(){ $('#restore-file').click(); });
  $('#restore-file').addEventListener('change', function(e){
    const f=e.target.files[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=function(){ try{ const d=JSON.parse(rd.result); Object.keys(d).forEach(function(k){ if(d[k]!=null) localStorage.setItem('fdq_'+k, d[k]); }); toast('Data dipulihkan', true); setTimeout(function(){ location.reload(); },800); }catch(err){ toast('File tidak valid', false); } };
    rd.readAsText(f);
  });

  $('#logout').addEventListener('click', logout);
})();
