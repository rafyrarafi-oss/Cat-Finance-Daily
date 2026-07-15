/* js/dashboard.js — cache-first, 1x request ke server */
(async function(){
  requireAuth();
  let chart;

  // 1) Tampilkan cache dulu (instan), kalau ada
  const cached = Store.getCachedDashboard();
  if(cached){ paint(cached); }

  // 2) Ambil data terbaru (1 panggilan getDashboard), lalu re-render
  try{
    const data = await Store.getDashboard();
    paint(data);
  }catch(e){
    if(!cached) toast('Gagal memuat data: '+e.message, false);
  }

  function paint(data){
    if(data.settings && data.settings.businessName) $('#biz').textContent = data.settings.businessName;
    const s = data.summary, base = s.currency||'IDR';
    $('#balance').textContent  = formatMoney(s.balance, base);
    $('#inToday').textContent  = formatMoney(s.incomeToday, base);
    $('#outToday').textContent = formatMoney(s.expenseToday, base);
    $('#inMonth').textContent  = compact(s.incomeMonth, base);
    $('#outMonth').textContent = compact(s.expenseMonth, base);
    renderRecent(data.recent||[]);
    drawChart(data.weekly);
  }

  function compact(n, cur){
    n = Number(n)||0; cur = cur||'IDR';
    if(cur==='IDR' && n>=1e6) return 'Rp '+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+'jt';
    return formatMoney(n,cur);
  }

  function renderRecent(rows){
    const box=$('#recent');
    const list=rows.slice(0,5);
    if(!list.length){ box.innerHTML='<div class="empty"><span class="ms">inbox</span><div style="font-size:13px;font-weight:600">Belum ada transaksi</div></div>'; return; }
    box.innerHTML = list.map(function(t){
      const ic=catIcon(t.category), inc=t.type==='income';
      return '<div class="tx">'
        +'<div class="ico" style="background:'+ic[2]+'"><span class="ms" style="color:'+ic[1]+'">'+ic[0]+'</span></div>'
        +'<div class="meta"><div class="t">'+t.category+' · '+(t.method||'')+'</div><div class="s">'+t.time+' · '+t.status+'</div></div>'
        +'<div class="amt" style="color:'+(inc?'var(--green)':'var(--red)')+'">'+signedMoney(t.amount,t.currency,inc)+'</div>'
        +'</div>';
    }).join('');
  }

  function drawChart(d){
    const el=$('#chart'); if(!el||!window.Chart||!d) return;
    const unit = d.unit || '';
    const cur = d.currency || 'IDR';
    if(chart) chart.destroy();
    chart = new Chart(el.getContext('2d'), {
      type:'line',
      data:{ labels:d.labels, datasets:[
        { label:'Masuk', data:d.income, borderColor:'#6C4CF0', backgroundColor:'rgba(108,76,240,.14)', fill:true, tension:.4, borderWidth:2.5, pointRadius:0 },
        { label:'Keluar', data:d.expense, borderColor:'#F59E0B', backgroundColor:'rgba(245,158,11,.10)', fill:true, tension:.4, borderWidth:2.5, pointRadius:0 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#241F3A', padding:10, cornerRadius:10,
          callbacks:{ label:function(c){ return c.dataset.label+': '+symbolOf(cur)+' '+c.parsed.y.toLocaleString('id-ID',{maximumFractionDigits:2})+unit; } } } },
        scales:{
          x:{ grid:{display:false}, border:{display:false}, ticks:{ color:'#918CAB', font:{family:'Plus Jakarta Sans',size:10,weight:'600'} } },
          y:{ grid:{color:'rgba(108,76,240,.1)'}, border:{display:false}, ticks:{ color:'#918CAB', font:{family:'Plus Jakarta Sans',size:10}, maxTicksLimit:4, callback:function(v){ return v+unit; } } }
        }
      }
    });
  }
})();
