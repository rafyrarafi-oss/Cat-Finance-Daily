/* js/utils.js — helper umum */
function $(sel, root){ return (root||document).querySelector(sel); }
function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTime(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function prettyDate(iso){
  if(!iso) return '';
  const [y,m,d]=String(iso).split('-');
  const bulan=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return pad(+d)+' '+bulan[(+m)-1]+' '+y;
}

function genRef(){
  return 'TRX-'+todayStr().replace(/-/g,'')+'-'+Math.floor(1000+Math.random()*9000);
}

/* Normalisasi tanggal/jam dari Google Sheets (yg sering balik jadi Date/ISO 1899-...) */
function normDate(v){
  if(v==null||v==='') return '';
  if(v instanceof Date) return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate());
  var s=String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;               // sudah yyyy-MM-dd
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})T/);               // ISO datetime
  if(m){ return m[1]==='1899' ? todayStr() : m[1]+'-'+m[2]+'-'+m[3]; }
  var d=new Date(s); if(!isNaN(d.getTime())) return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  return s;
}
function normTime(v){
  if(v==null||v==='') return '';
  if(v instanceof Date) return pad(v.getHours())+':'+pad(v.getMinutes());
  var s=String(v);
  if(/^\d{1,2}:\d{2}/.test(s)) return s.slice(0,5);          // sudah HH:mm
  var tm=s.match(/T(\d{2}):(\d{2})/);                        // ambil jam dari ISO
  if(tm) return tm[1]+':'+tm[2];
  return s;
}

function debounce(fn, ms){
  let t; return function(){ const a=arguments, c=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); }, ms||250); };
}

/* Toast notification */
function toast(msg, ok){
  let wrap=$('.toast-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.className='toast-wrap'; document.body.appendChild(wrap); }
  const el=document.createElement('div');
  el.className='toast '+(ok===false?'err':'ok');
  el.innerHTML='<span class="ms">'+(ok===false?'error':'check_circle')+'</span><span>'+msg+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){ el.style.opacity='0'; el.style.transform='translateY(10px)'; el.style.transition='.3s'; }, 2200);
  setTimeout(function(){ el.remove(); }, 2600);
}

/* ikon + warna per kategori */function catIcon(kategori){
  const m={
    Penjualan:['point_of_sale','#16A34A','rgba(22,163,74,.12)'],
    Bonus:['redeem','#16A34A','rgba(22,163,74,.12)'],
    Refund:['undo','#16A34A','rgba(22,163,74,.12)'],
    Belanja:['shopping_bag','#E5484D','rgba(229,72,77,.12)'],
    Operasional:['bolt','#F59E0B','rgba(245,158,11,.14)'],
    Transport:['local_shipping','#E5484D','rgba(229,72,77,.12)'],
    Internet:['wifi','#E5484D','rgba(229,72,77,.12)'],
    Makan:['restaurant','#E5484D','rgba(229,72,77,.12)'],
    Listrik:['bolt','#F59E0B','rgba(245,158,11,.14)'],
    Gaji:['payments','#E5484D','rgba(229,72,77,.12)']
  };
  return m[kategori]||['receipt_long','#6B6588','rgba(108,76,240,.12)'];
}

/* Indikator sinkron offline — muncul di semua halaman.
 * Menampilkan status offline / jumlah transaksi menunggu sinkron. */
(function initSyncPill(){
  if(typeof window==='undefined') return;
  function queueLen(){ try{ return (JSON.parse(localStorage.getItem('fdq_queue'))||[]).length; }catch(e){ return 0; } }
  function ensure(){
    let el=document.querySelector('.sync-pill');
    if(!el){ el=document.createElement('div'); el.className='sync-pill hidden'; el.innerHTML='<span class="ms"></span><span class="lbl"></span>'; (document.body||document.documentElement).appendChild(el); }
    return el;
  }
  let hideTimer;
  function paint(justSynced){
    const el=ensure(); const n=queueLen(); const off=navigator.onLine===false;
    clearTimeout(hideTimer);
    if(off){ el.className='sync-pill'; el.querySelector('.ms').textContent='cloud_off'; el.querySelector('.lbl').textContent = n? ('Offline \u00b7 '+n+' menunggu sinkron') : 'Mode offline'; return; }
    if(n>0){ el.className='sync-pill'; el.querySelector('.ms').textContent='sync'; el.querySelector('.lbl').textContent=n+' menunggu sinkron'; return; }
    if(justSynced){ el.className='sync-pill online'; el.querySelector('.ms').textContent='cloud_done'; el.querySelector('.lbl').textContent='Tersinkron'; hideTimer=setTimeout(function(){ el.className='sync-pill hidden'; }, 2200); return; }
    el.className='sync-pill hidden';
  }
  function boot(){ paint(false);
    window.addEventListener('fdq:pending', function(){ paint(false); });
    window.addEventListener('fdq:synced', function(){ paint(true); });
    window.addEventListener('online', function(){ setTimeout(function(){ paint(queueLen()===0); }, 400); });
    window.addEventListener('offline', function(){ paint(false); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
