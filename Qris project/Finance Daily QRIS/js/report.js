/* js/report.js — riwayat, filter, search, analitik, detail, export */
(async function(){
  requireAuth();
  await Store.getRates().then(setRates).catch(function(){});

  const filter = { range:'today', type:'all', status:'all', keyword:'' };
  const PAGE = 20;
  let allRows = [];   // hasil filter type/status/keyword (semua tanggal)
  let rows = [];      // + filter rentang aktif
  let shown = PAGE;

  function baseCur(){ try{ return (JSON.parse(localStorage.getItem('fdq_settings')||'{}').defaultCurrency)||'IDR'; }catch(e){ return 'IDR'; } }

  function inRange(dateStr){
    if(filter.range==='all') return true;
    const d=new Date(dateStr+'T00:00:00'), now=new Date();
    if(filter.range==='today') return dateStr===todayStr();
    if(filter.range==='week'){ const wk=new Date(now); wk.setDate(now.getDate()-6); return d>=new Date(wk.getFullYear(),wk.getMonth(),wk.getDate()); }
    if(filter.range==='month') return dateStr.slice(0,7)===todayStr().slice(0,7);
    if(filter.range==='year') return dateStr.slice(0,4)===todayStr().slice(0,4);
    return true;
  }

  async function load(){
    allRows = await Store.getTransactions({ type:filter.type, status:filter.status, keyword:filter.keyword });
    rows = allRows.filter(function(t){ return inRange(String(t.date)); });
    shown = PAGE;
    render();
  }

  function render(){
    const base = baseCur();
    let inc=0, out=0;
    rows.forEach(function(t){ const a=convert(Number(t.amount)||0, t.currency||'IDR', base); if(t.type==='income') inc+=a; else out+=a; });
    $('#sumIn').textContent  = formatMoney(inc,base);
    $('#sumOut').textContent = formatMoney(out,base);
    $('#sumBal').textContent = formatMoney(inc-out,base);
    $('#sumCount').textContent = rows.length;
    $('#count').textContent = rows.length;

    renderAnalytics(base);
    renderList();
  }

  /* ---------- ANALITIK ---------- */
  function renderAnalytics(base){
    // Bar kategori pengeluaran (mengikuti rentang aktif)
    const byCat = {};
    rows.forEach(function(t){ if(t.type!=='expense') return;
      const a=convert(Number(t.amount)||0, t.currency||'IDR', base);
      byCat[t.category]=(byCat[t.category]||0)+a; });
    const top = Object.keys(byCat).map(function(k){ return {name:k, val:byCat[k]}; })
                  .sort(function(a,b){ return b.val-a.val; }).slice(0,5);
    const max = top.length ? top[0].val : 1;
    $('#catBars').innerHTML = top.length ? top.map(function(c){
      const pct = Math.max(6, Math.round(c.val/max*100));
      return '<div class="cat-bar"><div class="top"><span>'+c.name+'</span><span class="amt">'+formatMoney(c.val,base)+'</span></div>'
        +'<div class="track"><div class="fill" style="width:'+pct+'%"></div></div></div>';
    }).join('') : '<div class="muted" style="font-size:12px;padding:4px 0">Belum ada pengeluaran pada rentang ini.</div>';

    // Bulan ini vs bulan lalu (dari allRows, lintas tanggal)
    const now=new Date();
    const thisM = now.getFullYear()+'-'+pad(now.getMonth()+1);
    const lm=new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastM = lm.getFullYear()+'-'+pad(lm.getMonth()+1);
    const agg={ inc:{}, out:{} };
    agg.inc[thisM]=0; agg.inc[lastM]=0; agg.out[thisM]=0; agg.out[lastM]=0;
    allRows.forEach(function(t){
      const m=String(t.date).slice(0,7); const a=convert(Number(t.amount)||0, t.currency||'IDR', base);
      if(m!==thisM && m!==lastM) return;
      if(t.type==='income') agg.inc[m]+=a; else agg.out[m]+=a;
    });
    $('#monthCmp').innerHTML =
      mcCard('Income', agg.inc[thisM], agg.inc[lastM], base, true) +
      mcCard('Expense', agg.out[thisM], agg.out[lastM], base, false);
  }
  function mcCard(label, cur, prev, base, incomeIsGood){
    const diff = cur-prev;
    const pct = prev>0 ? Math.round(diff/prev*100) : (cur>0?100:0);
    const up = diff>=0;
    const good = incomeIsGood ? up : !up;   // income naik = bagus; expense naik = jelek
    const cls = pct===0 ? '' : (good?'up':'down');
    const arrow = pct===0 ? 'remove' : (up?'arrow_upward':'arrow_downward');
    return '<div class="card"><div class="mc-k">'+label+' (bln ini)</div>'
      +'<div class="mc-v" style="color:'+(label==='Income'?'var(--green)':'var(--red)')+'">'+formatMoney(cur,base)+'</div>'
      +'<div class="mc-d '+cls+'"><span class="ms" style="font-size:13px">'+arrow+'</span>'+Math.abs(pct)+'% vs bln lalu</div></div>';
  }

  /* ---------- LIST + PAGINASI ---------- */
  function renderList(){
    if(!rows.length){ $('#list').innerHTML='<div class="empty"><span class="ms">search_off</span><div style="font-size:13px;font-weight:600">Tidak ada transaksi ditemukan</div></div>'; $('#load-more').classList.add('hidden'); return; }
    const slice = rows.slice(0, shown);
    $('#list').innerHTML = slice.map(function(t){
      const ic=catIcon(t.category), inc2=t.type==='income';
      const clip = t.attachment ? '<span class="ms" style="font-size:14px;color:var(--muted);margin-left:4px" title="ada lampiran">attachment</span>' : '';
      return '<div class="tx" data-id="'+t.id+'">'
        +'<div class="ico" style="background:'+ic[2]+'"><span class="ms" style="color:'+ic[1]+'">'+ic[0]+'</span></div>'
        +'<div class="meta"><div class="t">'+t.category+' \u00b7 '+(t.method||'')+clip+'</div><div class="s">'+prettyDate(t.date)+' '+t.time+' \u00b7 '+(t.description||'')+'</div></div>'
        +'<div style="text-align:right"><div class="amt" style="color:'+(inc2?'var(--green)':'var(--red)')+'">'+signedMoney(t.amount,t.currency,inc2)+'</div>'
        +'<span class="badge '+(t.status==='Pending'?'pending':'ok')+'" style="margin-top:4px">'+t.status+'</span></div>'
        +'<button class="icon-btn menu-btn" style="width:34px;height:34px;background:transparent;border:none;margin-left:2px"><span class="ms" style="color:#A9A3BF">more_vert</span></button>'
        +'</div>'
        +'<div class="tx-menu hidden" data-menu="'+t.id+'" style="display:flex;gap:6px;margin:-4px 0 10px;padding:0 4px">'
          +act('visibility','Detail','#6C4CF0','view')+act('edit','Edit','#6B6588','edit')
          +act('content_copy','Duplikat','#16A34A','dup')+act('delete','Hapus','#E5484D','del')
        +'</div>';
    }).join('');

    $('#load-more').classList.toggle('hidden', shown>=rows.length);
    $('#load-more').textContent = 'Muat lebih banyak ('+(rows.length-shown)+' lagi)';

    $all('.menu-btn').forEach(function(b){
      b.addEventListener('click', function(){
        const id=b.closest('.tx').dataset.id, m=$('[data-menu="'+id+'"]');
        m.classList.toggle('hidden');
      });
    });
    $all('.act').forEach(function(b){
      b.addEventListener('click', async function(){
        const id=b.closest('.tx-menu').dataset.menu, a=b.dataset.a;
        if(a==='del'){ if(!confirm('Hapus transaksi ini?')) return; await Store.deleteTransaction(id); toast('Transaksi dihapus', true); load(); }
        else if(a==='edit'){ location.href='transaction.html?id='+encodeURIComponent(id); }
        else if(a==='view'){ openDetail(id); }
        else if(a==='dup'){ const t=rows.filter(function(x){return x.id===id;})[0]; if(t){ const c=Object.assign({},t); delete c.id; c.reference=genRef(); c.time=nowTime(); c.date=todayStr(); await Store.addTransaction(c); toast('Transaksi diduplikat', true); load(); } }
      });
    });
  }
  function act(icon,label,color,a){
    return '<button class="act" data-a="'+a+'" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:'+hexA(color)+';border:none;border-radius:12px;cursor:pointer"><span class="ms" style="font-size:19px;color:'+color+'">'+icon+'</span><span style="font-size:9.5px;font-weight:600;color:'+color+'">'+label+'</span></button>';
  }
  function hexA(c){ const map={'#6C4CF0':'rgba(108,76,240,.09)','#6B6588':'rgba(107,101,136,.12)','#16A34A':'rgba(22,163,74,.1)','#F59E0B':'rgba(245,158,11,.1)','#E5484D':'rgba(229,72,77,.1)'}; return map[c]||'#f3f3f3'; }

  $('#load-more').addEventListener('click', function(){ shown+=PAGE; renderList(); });

  /* ---------- MODAL DETAIL ---------- */
  let detailId=null;
  function openDetail(id){
    const t = rows.filter(function(x){ return x.id===id; })[0]; if(!t) return;
    detailId=id;
    const inc=t.type==='income';
    $('#d-title').textContent = t.category;
    function row(k,v){ return v?('<div class="row"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>'):''; }
    $('#d-body').innerHTML =
      '<div class="row"><span class="k">Nominal</span><span class="v" style="color:'+(inc?'var(--green)':'var(--red)')+';font-family:\'Space Grotesk\';font-size:15px">'+signedMoney(t.amount,t.currency,inc)+'</span></div>'
      + row('Jenis', inc?'Income':'Expense')
      + row('Tanggal', prettyDate(t.date)+' '+ (t.time||''))
      + row('Subkategori', t.subcategory)
      + row('Deskripsi', t.description)
      + row('Metode', t.method)
      + row('Status', t.status)
      + row('Referensi', t.reference)
      + row('Catatan', t.note)
      + (t.attachment ? '<div class="receipt"><img src="'+t.attachment+'" alt="struk"></div>' : '');
    $('#detail-backdrop').classList.remove('hidden');
  }
  function closeDetail(){ $('#detail-backdrop').classList.add('hidden'); detailId=null; }
  $('#d-close').addEventListener('click', closeDetail);
  $('#detail-backdrop').addEventListener('click', function(e){ if(e.target===$('#detail-backdrop')) closeDetail(); });
  $('#d-edit').addEventListener('click', function(){ if(detailId) location.href='transaction.html?id='+encodeURIComponent(detailId); });
  $('#d-print').addEventListener('click', function(){ window.print(); });

  /* ---------- EVENTS ---------- */
  $('#search').addEventListener('input', debounce(function(e){ filter.keyword=e.target.value; load(); }, 250));
  bindGroup('#ranges .chip','r', function(v){ filter.range=v; });
  bindGroup('#types button','t', function(v){ filter.type=v; });
  bindGroup('#statuses .chip','st', function(v){ filter.status=v; });

  function bindGroup(sel, attr, cb){
    $all(sel).forEach(function(b){
      b.addEventListener('click', function(){
        $all(sel).forEach(function(x){ x.classList.remove('active'); if(sel.indexOf('chip')>-1) x.classList.remove('pill'); });
        b.classList.add('active'); if(sel.indexOf('chip')>-1) b.classList.add('pill');
        cb(b.dataset[attr]); load();
      });
    });
  }

  $('#print').addEventListener('click', function(){ window.print(); });
  $('#export-csv').addEventListener('click', function(){ exportCSV(rows); });

  function exportCSV(data){
    const head=['Tanggal','Jam','Jenis','Kategori','Subkategori','Deskripsi','Metode','Nominal','Currency','Status','Referensi'];
    const lines=[head.join(',')].concat(data.map(function(t){
      return [t.date,t.time,t.type,t.category,t.subcategory,'"'+(t.description||'')+'"',t.method,t.amount,t.currency,t.status,t.reference].join(',');
    }));
    const blob=new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='transaksi-'+todayStr()+'.csv'; a.click(); URL.revokeObjectURL(a.href);
    toast('CSV berhasil diunduh', true);
  }

  // sinkron ulang setelah antrian offline terkirim
  window.addEventListener('fdq:synced', function(){ toast('Data tersinkron', true); load(); });

  load();
})();
