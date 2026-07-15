/* js/currency.js — format & konversi mata uang */
const CURRENCY_SYMBOLS = { IDR:'Rp', USD:'$', KHR:'\u17DB' };
const CURRENCY_FLAGS   = { IDR:'\uD83C\uDC69', USD:'\uD83C\uDDFA\uD83C\uDDF8', KHR:'\uD83C\uDDF0\uD83C\uDDED' };

/* Kurs default (nilai 1 unit mata uang dalam IDR). Diperbarui dari sheet ExchangeRate. */
let RATES = { IDR:1, USD:16250, KHR:4 };

function setRates(list){
  // list: [{currency, rate}] dari API/store
  if(!Array.isArray(list)) return;
  list.forEach(function(r){ if(r && r.currency) RATES[r.currency]=Number(r.rate)||RATES[r.currency]; });
}

function symbolOf(cur){ return CURRENCY_SYMBOLS[cur] || cur+' '; }

/* Format nominal: "Rp 25.000" / "$ 3.50" */
function formatMoney(amount, cur){
  cur = cur || 'IDR';
  const n = Number(amount)||0;
  const grouped = n.toLocaleString('id-ID', { maximumFractionDigits: cur==='USD'?2:0 });
  return symbolOf(cur) + ' ' + grouped;
}

/* Tanda +/- untuk transaksi */
function signedMoney(amount, cur, isIncome){
  return (isIncome?'+':'\u2212') + formatMoney(amount, cur);
}

/* Konversi antar mata uang lewat IDR sebagai basis */
function convert(amount, from, to){
  const inIdr = (Number(amount)||0) * (RATES[from]||1);
  return inIdr / (RATES[to]||1);
}

if(typeof window!=='undefined'){ window.setRates=setRates; window.formatMoney=formatMoney; }
