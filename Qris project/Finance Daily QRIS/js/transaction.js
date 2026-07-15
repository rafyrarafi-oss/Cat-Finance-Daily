/* js/transaction.js — tambah & edit transaksi */
(async function(){
  requireAuth();

  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const isEdit = !!editId;

  const state = { jenis:'income', currency:'IDR', category:null, method:'QRIS', status:'Sukses', amount:0, attachment:'' };
  let saving = false;

  // default (mode tambah)
  $('#date').value = todayStr();
  $('#time').value = nowTime();
  $('#reference').value = genRef();

  // ---------- kategori ----------
  let allCats = [];
  try{ allCats = await Store.getCategories(); }catch(e){ allCats = []; }
  function renderCats(){
    const list = allCats.filter(function(c){ return c.type===state.jenis; });
    $('#cats').innerHTML = list.map(function(c){
      return '<button class="chip'+(c.name===state.category?' active':'')+'" data-cat="'+c.name+'">'+c.name+'</button>';
    }).join('');
    $all('#cats .chip').forEach(function(b){
      b.addEventListener('click', function(){
        state.category=b.dataset.cat;
        $all('#cats .chip').forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
      });
    });
  }

  // ---------- jenis ----------
  function setJenis(j, keepCat){
    state.jenis=j; if(!keepCat) state.category=null;
    const inc=j==='income';
    $('#j-income').className  = 'btn '+(inc?'green':'btn-ghost');
    $('#j-expense').className = 'btn '+(!inc?'red':'btn-ghost');
    $('#save').className = 'btn '+(inc?'green':'red');
    renderCats();
  }
  $('#j-income').addEventListener('click', function(){ setJenis('income'); });
  $('#j-expense').addEventListener('click', function(){ setJenis('expense'); });

  // ---------- currency ----------
  function setCurrency(cur){
    state.currency=cur;
    $all('#cur button').forEach(function(x){ x.classList.toggle('active', x.dataset.cur===cur); });
    $('#sym').textContent = symbolOf(cur);
  }
  $all('#cur button').forEach(function(b){ b.addEventListener('click', function(){ setCurrency(b.dataset.cur); }); });

  // ---------- nominal ----------
  function setAmount(n){
    state.amount = Number(n)||0;
    $('#amount').value = state.amount ? state.amount.toLocaleString('id-ID') : '';
  }
  $('#amount').addEventListener('input', function(e){
    const d=e.target.value.replace(/\D/g,'');
    setAmount(d?parseInt(d,10):0);
  });

  // ---------- method ----------
  function setMethod(m){
    state.method=m;
    $all('#methods .chip').forEach(function(x){ x.classList.toggle('active', x.dataset.m===m); x.classList.toggle('pill', x.dataset.m===m); });
  }
  $all('#methods .chip').forEach(function(b){ b.addEventListener('click', function(){ setMethod(b.dataset.m); }); });

  // ---------- status ----------
  function setStatus(s){
    state.status=s;
    $('#st-ok').className   = 'chip '+(s==='Sukses'?'pill active':'');
    $('#st-pend').className = 'chip '+(s==='Pending'?'pill active':'');
    $('#st-ok').style.cssText='flex:1;text-align:center;justify-content:center';
    $('#st-pend').style.cssText='flex:1;text-align:center;justify-content:center';
  }
  $('#st-ok').addEventListener('click', function(){ setStatus('Sukses'); });
  $('#st-pend').addEventListener('click', function(){ setStatus('Pending'); });

  $('#regen').addEventListener('click', function(){ $('#reference').value = genRef(); });

  // ---------- lampiran (foto struk) ----------
  function showAttach(dataUrl){
    if(dataUrl){
      $('#attach-img').src = dataUrl;
      $('#attach-preview').classList.remove('hidden');
      $('#attach-drop').classList.add('hidden');
    } else {
      $('#attach-preview').classList.add('hidden');
      $('#attach-drop').classList.remove('hidden');
    }
  }
  function compressImage(file, cb){
    const rd=new FileReader();
    rd.onload=function(){
      const img=new Image();
      img.onload=function(){
        const max=1100, sc=Math.min(1, max/Math.max(img.width,img.height));
        const cv=document.createElement('canvas');
        cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc);
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        cb(cv.toDataURL('image/jpeg',0.72));
      };
      img.onerror=function(){ cb(rd.result); };
      img.src=rd.result;
    };
    rd.readAsDataURL(file);
  }
  $('#attach-drop').addEventListener('click', function(){ $('#attach-file').click(); });
  $('#attach-file').addEventListener('change', function(e){
    const f=e.target.files[0]; if(!f) return;
    if(f.size > 8*1024*1024){ toast('Foto terlalu besar (maks 8MB)', false); return; }
    compressImage(f, function(url){ state.attachment=url; showAttach(url); });
  });
  $('#attach-remove').addEventListener('click', function(){ state.attachment=''; $('#attach-file').value=''; showAttach(''); });

  // ---------- init default (tambah) ----------
  setJenis('income'); setCurrency('IDR'); setMethod('QRIS'); setStatus('Sukses');

  // ---------- mode EDIT ----------
  if(isEdit){
    $('#page-title').textContent = 'Edit Transaksi';
    $('#save').innerHTML = '<span class="ms">check</span>Simpan Perubahan';
    try{
      const t = await Store.getTransaction(editId);
      if(!t){ toast('Transaksi tidak ditemukan', false); }
      else {
        setJenis(t.type||'income', true);
        state.category = t.category || null; renderCats();
        setCurrency(t.currency||'IDR');
        setAmount(t.amount||0);
        setMethod(t.method||'QRIS');
        setStatus(t.status||'Sukses');
        $('#date').value = t.date || todayStr();
        $('#time').value = t.time || nowTime();
        $('#subcategory').value = t.subcategory || '';
        $('#description').value = t.description || '';
        $('#reference').value = t.reference || genRef();
        $('#note').value = t.note || '';
        state.attachment = t.attachment || '';
        showAttach(state.attachment);
      }
    }catch(e){ toast('Gagal memuat transaksi: '+e.message, false); }
  }

  // ---------- simpan ----------
  $('#save').addEventListener('click', async function(){
    if(saving) return;
    if(!state.amount){ toast('Nominal wajib diisi', false); return; }
    if(!state.category){ toast('Kategori wajib dipilih', false); return; }
    const data = {
      date:$('#date').value || todayStr(), time:$('#time').value || nowTime(),
      type:state.jenis, category:state.category, subcategory:$('#subcategory').value,
      description:$('#description').value, method:state.method, amount:state.amount,
      currency:state.currency, reference:$('#reference').value, status:state.status,
      attachment:state.attachment||'', note:$('#note').value
    };
    saving=true; $('#save').disabled=true;
    try{
      if(isEdit){ data.id=editId; await Store.updateTransaction(data); toast('Perubahan tersimpan', true); }
      else { await Store.addTransaction(data); toast('Transaksi berhasil disimpan', true); }
      setTimeout(function(){ location.href = isEdit ? 'report.html' : 'dashboard.html'; }, 700);
    }catch(e){ toast(e.message||'Gagal menyimpan', false); saving=false; $('#save').disabled=false; }
  });
})();
