/* js/auth.js — sesi login sederhana */
const SESSION_KEY = 'fdq_session';

function setSession(user){ localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function getSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } }
function logout(){ localStorage.removeItem(SESSION_KEY); location.href='index.html'; }

/* Panggil di setiap halaman terproteksi: redirect ke login bila belum masuk. */
function requireAuth(){
  const u=getSession();
  if(!u){ location.href='index.html'; return null; }
  return u;
}

if(typeof window!=='undefined'){ window.getSession=getSession; window.logout=logout; window.requireAuth=requireAuth; window.setSession=setSession; }
