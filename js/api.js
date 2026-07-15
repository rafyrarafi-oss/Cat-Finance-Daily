/**
 * js/api.js — Klien Supabase untuk Finance Daily QRIS
 * ===================================================
 * Memakai REST API bawaan Supabase (PostgREST) via fetch — tanpa library tambahan.
 *
 * LANGKAH:
 *   1. Buka Supabase Dashboard > Project Settings > API.
 *   2. Salin "Project URL" dan "anon public" key ke bawah ini.
 *   3. Jalankan SQL di backend/supabase.sql (SQL Editor) untuk membuat tabel + data awal.
 */

// ====== KONFIGURASI SUPABASE ======

const SUPABASE_URL = 'https://bnqajcbbqohppujkjrar.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VtdHw5f2oycYXrm2felFjA_81ueUymG';

const API_URL = SUPABASE_URL;
const REST = SUPABASE_URL + '/rest/v1/';

function sbHeaders(extra){
  return Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  }, extra||{});
}

/* Helper query dasar */
async function sbSelect(table, query){
  const res = await fetch(REST + table + (query?('?'+query):''), { headers: sbHeaders() });
  if(!res.ok) throw new Error('Supabase: ' + (await res.text()));
  return res.json();
}
async function sbInsert(table, row){
  const res = await fetch(REST + table, {
    method:'POST', headers: sbHeaders({ Prefer:'return=representation' }), body: JSON.stringify(row)
  });
  if(!res.ok) throw new Error('Supabase: ' + (await res.text()));
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}
async function sbUpdate(table, idFilter, patch){
  const res = await fetch(REST + table + '?' + idFilter, {
    method:'PATCH', headers: sbHeaders({ Prefer:'return=representation' }), body: JSON.stringify(patch)
  });
  if(!res.ok) throw new Error('Supabase: ' + (await res.text()));
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}
async function sbDelete(table, idFilter){
  const res = await fetch(REST + table + '?' + idFilter, { method:'DELETE', headers: sbHeaders() });
  if(!res.ok) throw new Error('Supabase: ' + (await res.text()));
  return { deleted:true };
}
async function sbUpsert(table, rows, onConflict){
  const res = await fetch(REST + table + (onConflict?('?on_conflict='+onConflict):''), {
    method:'POST', headers: sbHeaders({ Prefer:'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(rows)
  });
  if(!res.ok) throw new Error('Supabase: ' + (await res.text()));
  return res.json();
}

// ====== API per-fitur (dipanggil oleh js/store.js) ======
const API = {
  // AUTH
  async login(username, password){
    const rows = await sbSelect('users',
      'username=eq.'+encodeURIComponent(username)+'&password=eq.'+encodeURIComponent(password)+'&select=username,name,role&limit=1');
    if(!rows.length) throw new Error('Username atau password salah');
    return rows[0];
  },

  // TRANSACTIONS
  getTransactions: (filter={}) => {
    let q = 'select=*&order=date.desc,time.desc';
    if(filter.type && filter.type!=='all')       q += '&type=eq.'+filter.type;
    if(filter.status && filter.status!=='all')   q += '&status=eq.'+filter.status;
    if(filter.currency && filter.currency!=='all') q += '&currency=eq.'+filter.currency;
    return sbSelect('transactions', q);
  },
  addTransaction:   (data) => sbInsert('transactions', stripId(data)),
  updateTransaction:(data) => sbUpdate('transactions', 'id=eq.'+data.id, stripId(data)),
  deleteTransaction:(id)   => sbDelete('transactions', 'id=eq.'+id),

  // CATEGORIES
  getCategories:  () => sbSelect('categories', 'select=*&order=type,name'),
  addCategory:    (data) => sbInsert('categories', { type:data.type, name:data.name }),
  deleteCategory: (id)   => sbDelete('categories', 'id=eq.'+id),

  // SETTINGS (tabel key/value)
  async getSettings(){
    const rows = await sbSelect('settings', 'select=key,value');
    const obj = {}; rows.forEach(r=>{ obj[r.key]=r.value; }); return obj;
  },
  async saveSettings(obj){
    const rows = Object.keys(obj).map(k=>({ key:k, value:String(obj[k]) }));
    await sbUpsert('settings', rows, 'key'); return obj;
  },

  // EXCHANGE RATE
  getRates: () => sbSelect('exchange_rate', 'select=currency,rate'),
  saveRate: (currency, rate) => sbUpsert('exchange_rate',
      [{ currency:currency, rate:Number(rate), updated_at:new Date().toISOString() }], 'currency'),

  // DASHBOARD (1x, paralel)
  async getDashboard(){
    const [transactions, settingsRows, rates] = await Promise.all([
      sbSelect('transactions', 'select=*&order=date.desc,time.desc'),
      sbSelect('settings', 'select=key,value'),
      sbSelect('exchange_rate', 'select=currency,rate')
    ]);
    const settings = {}; settingsRows.forEach(r=>{ settings[r.key]=r.value; });
    return { transactions, settings, rates };
  }
};

// buang id kosong biar Supabase generate sendiri (uuid default)
function stripId(d){ const o=Object.assign({}, d); if(!o.id) delete o.id; return o; }

if(typeof window!=='undefined'){ window.API = API; }
