/* js/store.js — lapisan data (offline-first).
 * - Pakai Supabase (API) bila SUPABASE_URL sudah dikonfigurasi (bukan placeholder).
 * - Bila belum -> fallback ke localStorage + data demo (situs tetap jalan di GitHub Pages).
 * - OFFLINE-FIRST: baca dilayani dari cache saat jaringan mati; tulis dioptimasi
 *   (langsung tampil) lalu diantrikan & disinkronkan otomatis begitu online lagi.
 */
const LS = 'fdq_';
const QKEY = LS + 'queue';        // antrian tulis offline
const TXC  = LS + 'txns_cache';   // mirror transaksi terakhir dari server

function apiConfigured(){
  return typeof API_URL !== 'undefined' && API_URL && !/XXXX/.test(API_URL);
}
/* Data cache untuk mode offline; kalau kosong (belum pernah sync) pakai demo biar UI tetap terisi. */
function offlineRows(){
  const c = txCache();
  if(c.length) return c;
  seedDemo(); return lsGet('txns');
}
function isOnline(){ return typeof navigator === 'undefined' ? true : navigator.onLine !== false; }
function isNetErr(e){ return e && (e.name === 'TypeError' || /fetch|network|Failed to fetch/i.test(String(e.message||e))); }

/* ---------- SEED DEMO (localStorage) ---------- */
function seedDemo(){
  if(localStorage.getItem(LS+'seeded')) return;
  const t = todayStr();
  const users = [{ id:'u1', username:'owner', password:'123456', name:'Owner', role:'admin' }];
  const txns = [
    mk(t,'09:24','income','Penjualan','Menu makanan','Order meja 4','QRIS',25000,'IDR','Sukses'),
    mk(t,'09:02','expense','Belanja','Bahan baku','Sayur & ayam','Tunai',120000,'IDR','Sukses'),
    mk(t,'08:47','income','Penjualan','Minuman','Es teh x3','QRIS',18000,'IDR','Sukses'),
    mk(t,'08:30','expense','Operasional','Kemasan','Box & plastik','Transfer',85000,'IDR','Pending'),
    mk(t,'08:12','income','Penjualan','Paket hemat','Combo A x2','Tunai',42000,'IDR','Sukses'),
    mk(t,'07:58','expense','Transport','Ongkir','Kirim pesanan','Tunai',35000,'IDR','Sukses'),
    mk(t,'07:40','expense','Internet','Wifi bulanan','Tagihan Juli','Transfer',150000,'IDR','Sukses'),
    mk(t,'07:22','income','Penjualan','Menu makanan','Order bungkus','QRIS',67500,'IDR','Sukses'),
    mk(t,'07:05','expense','Makan','Karyawan','Sarapan tim','Tunai',48000,'IDR','Sukses'),
    mk(t,'06:50','income','Refund','Pesanan batal','Refund order 12','QRIS',12000,'IDR','Pending')
  ];
  const cats = [
    ...['Penjualan','Bonus','Refund','Lainnya'].map(function(n,i){ return {id:'ci'+i,type:'income',name:n}; }),
    ...['Makan','Transport','Belanja','Operasional','Internet','Gaji','Listrik','Air','Sewa','Pajak','Investasi','Hiburan','Peralatan','Lainnya'].map(function(n,i){ return {id:'ce'+i,type:'expense',name:n}; })
  ];
  const settings = { businessName:'Warung Sari Rasa', defaultCurrency:'IDR', theme:'light', ownerName:'Owner', logo:'' };
  const rates = [{currency:'IDR',rate:1},{currency:'USD',rate:16250},{currency:'KHR',rate:4}];
  localStorage.setItem(LS+'users', JSON.stringify(users));
  localStorage.setItem(LS+'txns', JSON.stringify(txns));
  localStorage.setItem(LS+'cats', JSON.stringify(cats));
  localStorage.setItem(LS+'settings', JSON.stringify(settings));
  localStorage.setItem(LS+'rates', JSON.stringify(rates));
  localStorage.setItem(LS+'seeded','1');
}
function mk(date,time,type,category,subcategory,description,method,amount,currency,status){
  return { id:genId8(), date:date, time:time, type:type, category:category, subcategory:subcategory,
    description:description, method:method, amount:amount, currency:currency, reference:genRef(),
    status:status, attachment:'', note:'', createdAt:new Date().toISOString() };
}
function genId8(){ return Math.random().toString(36).slice(2,10); }
function lsGet(k){ try{ return JSON.parse(localStorage.getItem(LS+k))||[]; }catch(e){ return []; } }
function lsSet(k,v){ localStorage.setItem(LS+k, JSON.stringify(v)); }

/* Bersihkan tanggal/jam tiap transaksi */
function normTx(t){
  var o=Object.assign({},t);
  o.date=normDate(t.date); o.time=normTime(t.time);
  return o;
}

/* Mata uang dasar untuk semua TOTAL. Diambil dari Settings. */
function baseCurrency(){
  try{ return (JSON.parse(localStorage.getItem(LS+'settings')||'{}').defaultCurrency) || 'IDR'; }
  catch(e){ return 'IDR'; }
}

/* ---------- OFFLINE WRITE QUEUE ---------- */
function loadQueue(){ try{ return JSON.parse(localStorage.getItem(QKEY))||[]; }catch(e){ return []; } }
function saveQueue(q){ localStorage.setItem(QKEY, JSON.stringify(q)); emitPending(); }
function enqueue(op){ const q=loadQueue(); q.push(op); saveQueue(q); }
function pendingCount(){ return loadQueue().length; }
function emitPending(){
  if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('fdq:pending',{ detail:{ count: pendingCount() } }));
}

/* Mirror transaksi lokal (cache baca + basis optimistic write) */
function txCache(){ try{ return JSON.parse(localStorage.getItem(TXC))||[]; }catch(e){ return []; } }
function setTxCache(rows){ try{ localStorage.setItem(TXC, JSON.stringify(rows)); }catch(e){} }
function cacheUpsert(row){ const c=txCache().filter(function(t){ return t.id!==row.id; }); c.unshift(row); setTxCache(c); }
function cacheRemove(id){ setTxCache(txCache().filter(function(t){ return t.id!==id; })); }

/* Kirim satu operasi ke server (dipakai flushQueue). */
async function runOp(op){
  if(op.fn==='addTransaction')    return API.addTransaction(op.data);
  if(op.fn==='updateTransaction') return API.updateTransaction(op.data);
  if(op.fn==='deleteTransaction') return API.deleteTransaction(op.id);
  if(op.fn==='addCategory')       return API.addCategory(op.data);
  if(op.fn==='deleteCategory')    return API.deleteCategory(op.id);
  if(op.fn==='saveSettings')      return API.saveSettings(op.data);
  if(op.fn==='saveRate')          return API.saveRate(op.data.currency, op.data.rate);
  return null;
}

let flushing = false;
async function flushQueue(){
  if(flushing || !apiConfigured() || !isOnline()) return;
  flushing = true;
  try{
    let q = loadQueue();
    while(q.length){
      try{ await runOp(q[0]); q.shift(); saveQueue(q); }
      catch(e){ if(isNetErr(e)) break; else { q.shift(); saveQueue(q); } } // buang op yg error non-jaringan biar antrian gak macet
      q = loadQueue();
    }
  } finally { flushing = false; }
}

if(typeof window!=='undefined'){
  window.addEventListener('online', function(){ flushQueue().then(function(){ window.dispatchEvent(new Event('fdq:synced')); }); });
}

/* ---------- API STORE ---------- */
const Store = {
  async login(username, password){
    if(apiConfigured()) return API.login(username, password);
    seedDemo();
    const u = lsGet('users').filter(function(x){ return x.username===username && String(x.password)===String(password); })[0];
    if(!u) throw new Error('Username atau password salah');
    return { username:u.username, name:u.name, role:u.role };
  },
  async getRates(){
    if(apiConfigured()){
      try{ const r = await API.getRates(); lsSet('rates', r); return r; }
      catch(e){ if(isNetErr(e)) return lsGet('rates'); throw e; }
    }
    seedDemo(); return lsGet('rates');
  },
  async getSettings(){
    if(apiConfigured()){
      try{ const s = await API.getSettings(); localStorage.setItem(LS+'settings', JSON.stringify(s)); return s; }
      catch(e){ if(isNetErr(e)) return JSON.parse(localStorage.getItem(LS+'settings')||'{}'); throw e; }
    }
    seedDemo(); return JSON.parse(localStorage.getItem(LS+'settings')||'{}');
  },
  async saveSettings(obj){
    const cur = JSON.parse(localStorage.getItem(LS+'settings')||'{}');
    localStorage.setItem(LS+'settings', JSON.stringify(Object.assign(cur,obj)));
    if(apiConfigured()){
      try{ return await API.saveSettings(obj); }
      catch(e){ if(isNetErr(e)){ enqueue({fn:'saveSettings',data:obj}); return obj; } throw e; }
    }
    return obj;
  },
  async getCategories(){
    if(apiConfigured()){
      try{ const c = await API.getCategories(); lsSet('cats', c); return c; }
      catch(e){ if(isNetErr(e)) return lsGet('cats'); throw e; }
    }
    seedDemo(); return lsGet('cats');
  },
  async addCategory(data){
    const row = Object.assign({ id:genId8() }, data);
    const c = lsGet('cats'); c.push(row); lsSet('cats', c);
    if(apiConfigured()){
      try{ return await API.addCategory(data); }
      catch(e){ if(isNetErr(e)){ enqueue({fn:'addCategory',data:data}); return row; } throw e; }
    }
    return row;
  },
  async deleteCategory(id){
    lsSet('cats', lsGet('cats').filter(function(x){ return x.id!==id; }));
    if(apiConfigured()){
      try{ return await API.deleteCategory(id); }
      catch(e){ if(isNetErr(e)){ enqueue({fn:'deleteCategory',id:id}); return {id:id,deleted:true}; } throw e; }
    }
    return {id:id,deleted:true};
  },
  async getTransactions(filter){
    filter = filter||{};
    let rows;
    if(apiConfigured()){
      try{ rows = await API.getTransactions(filter); setTxCache(rows.map(normTx)); }
      catch(e){ if(isNetErr(e)) rows = offlineRows(); else throw e; }
    } else { seedDemo(); rows = lsGet('txns'); }
    rows = rows.map(normTx);
    rows = rows.filter(function(t){
      if(filter.type && filter.type!=='all' && t.type!==filter.type) return false;
      if(filter.status && filter.status!=='all' && t.status!==filter.status) return false;
      if(filter.currency && filter.currency!=='all' && t.currency!==filter.currency) return false;
      if(filter.keyword){
        const hay=[t.category,t.subcategory,t.description,t.reference,t.method].join(' ').toLowerCase();
        if(hay.indexOf(String(filter.keyword).toLowerCase())===-1) return false;
      }
      return true;
    });
    return rows.sort(function(a,b){ return String(b.date+b.time).localeCompare(String(a.date+a.time)); });
  },
  async getTransaction(id){
    const rows = await this.getTransactions();
    return rows.filter(function(t){ return String(t.id)===String(id); })[0] || null;
  },
  async addTransaction(data){
    if(!data.amount || Number(data.amount)<=0) throw new Error('Nominal wajib diisi');
    if(!data.category) throw new Error('Kategori wajib dipilih');
    if(!data.date) throw new Error('Tanggal wajib diisi');
    if(apiConfigured()){
      const optimistic = Object.assign({ id:genId8(), createdAt:new Date().toISOString() }, data);
      try{ const saved = await API.addTransaction(data); cacheUpsert(normTx(saved)); return saved; }
      catch(e){ if(isNetErr(e)){ cacheUpsert(normTx(optimistic)); enqueue({fn:'addTransaction',data:data}); return optimistic; } throw e; }
    }
    const rows=lsGet('txns'); const row=Object.assign({id:genId8(),createdAt:new Date().toISOString()},data);
    rows.push(row); lsSet('txns',rows); return row;
  },
  async updateTransaction(data){
    if(apiConfigured()){
      try{ const saved = await API.updateTransaction(data); cacheUpsert(normTx(Object.assign({},data,saved))); return saved; }
      catch(e){ if(isNetErr(e)){ cacheUpsert(normTx(data)); enqueue({fn:'updateTransaction',data:data}); return data; } throw e; }
    }
    const rows=lsGet('txns').map(function(t){ return t.id===data.id?Object.assign({},t,data):t; }); lsSet('txns',rows); return data;
  },
  async deleteTransaction(id){
    if(apiConfigured()){
      cacheRemove(id);
      try{ return await API.deleteTransaction(id); }
      catch(e){ if(isNetErr(e)){ enqueue({fn:'deleteTransaction',id:id}); return {id:id,deleted:true}; } throw e; }
    }
    lsSet('txns', lsGet('txns').filter(function(t){ return t.id!==id; })); return {id:id,deleted:true};
  },
  async saveRate(currency, rate){
    if(apiConfigured()){
      try{ return await API.saveRate(currency, rate); }
      catch(e){ if(isNetErr(e)){ enqueue({fn:'saveRate',data:{currency:currency,rate:rate}}); return {currency:currency,rate:rate}; } throw e; }
    }
    const rates = lsGet('rates').filter(function(r){ return r.currency!==currency; });
    rates.push({currency:currency, rate:Number(rate)}); lsSet('rates', rates); return {currency:currency,rate:rate};
  },
  pendingCount: pendingCount,
  flushQueue: flushQueue,

  _summaryFrom(rows){
    const base=baseCurrency();
    const t=todayStr(); const month=t.slice(0,7);
    const s={balance:0,incomeToday:0,expenseToday:0,incomeMonth:0,expenseMonth:0,countToday:0,currency:base};
    rows.forEach(function(x){
      const amt=convert(Number(x.amount)||0, x.currency||'IDR', base), inc=x.type==='income';
      s.balance += inc?amt:-amt;
      if(String(x.date)===t){ s.countToday++; if(inc) s.incomeToday+=amt; else s.expenseToday+=amt; }
      if(String(x.date).slice(0,7)===month){ if(inc) s.incomeMonth+=amt; else s.expenseMonth+=amt; }
    });
    return s;
  },
  _weeklyFrom(rows){
    const base=baseCurrency();
    const useJt = base==='IDR';
    const scale = useJt ? 1e6 : (base==='KHR' ? 1000 : 1);
    const days=[]; const labels=[]; const income=[]; const expense=[];
    const nm=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i);
      const key=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      days.push(key); labels.push(nm[d.getDay()]); income.push(0); expense.push(0);
    }
    rows.forEach(function(x){ const idx=days.indexOf(String(x.date)); if(idx>-1){
      const amt=convert(Number(x.amount)||0, x.currency||'IDR', base)/scale;
      if(x.type==='income') income[idx]+=amt; else expense[idx]+=amt; }});
    const unit = useJt ? 'jt' : (base==='KHR' ? 'rb' : '');
    if(income.reduce(function(a,b){return a+b;},0)===0 && base==='IDR'){
      return { labels:['Sen','Sel','Rab','Kam','Jum','Sab','Min'],
               income:[1.2,1.6,1.4,1.9,2.1,2.6,2.3], expense:[0.6,0.8,0.5,0.9,1.0,1.1,0.7], unit:'jt', currency:base };
    }
    return { labels:labels, income:income, expense:expense, unit:unit, currency:base };
  },
  async getSummary(){ return this._summaryFrom(await this.getTransactions()); },
  async getWeekly(){ return this._weeklyFrom(await this.getTransactions()); },

  /* SATU panggilan untuk seluruh dashboard. */
  async getDashboard(){
    let rows, settings, rates;
    if(apiConfigured()){
      try{
        const d = await API.getDashboard();
        rows = d.transactions||[]; settings = d.settings||{}; rates = d.rates||[];
        setTxCache(rows.map(normTx));
        try{ localStorage.setItem(LS+'settings', JSON.stringify(settings)); }catch(e){}
        try{ lsSet('rates', rates); }catch(e){}
      }catch(e){
        if(!isNetErr(e)) throw e;
        rows = offlineRows(); settings = JSON.parse(localStorage.getItem(LS+'settings')||'{}'); rates = lsGet('rates');
        if(!rates.length){ rates = [{currency:'IDR',rate:1},{currency:'USD',rate:16250},{currency:'KHR',rate:4}]; }
      }
    } else {
      seedDemo();
      rows = lsGet('txns'); settings = JSON.parse(localStorage.getItem(LS+'settings')||'{}'); rates = lsGet('rates');
    }
    setRates(rates);
    rows = rows.map(normTx).sort(function(a,b){ return String(b.date+b.time).localeCompare(String(a.date+a.time)); });
    const data = {
      settings: settings, rates: rates,
      summary: this._summaryFrom(rows),
      weekly:  this._weeklyFrom(rows),
      recent:  rows.slice(0,5)
    };
    try{ localStorage.setItem(LS+'cache_dash', JSON.stringify({ t:Date.now(), mode: apiConfigured()?'supabase':'demo', data:data })); }catch(e){}
    return data;
  },
  getCachedDashboard(){
    try{
      const c=JSON.parse(localStorage.getItem(LS+'cache_dash'));
      if(!c || !c.data) return null;
      const mode = apiConfigured()?'supabase':'demo';
      if(c.mode && c.mode!==mode) return null;
      return c.data;
    }catch(e){ return null; }
  }
};

/* Sinkron antrian saat halaman dibuka (kalau ada tunggakan & online). */
if(typeof window!=='undefined'){
  window.Store=Store;
  if(apiConfigured() && isOnline() && pendingCount()>0){ flushQueue(); }
}
