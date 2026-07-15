/* js/app.js — bootstrap kecil bersama (opsional).
 * Saat ini tiap halaman punya script sendiri; file ini disediakan untuk
 * kebutuhan bersama di masa depan (mis. tema, tahun footer, dsb).
 */
(function(){
  // Contoh: terapkan tema tersimpan
  try{
    var s = JSON.parse(localStorage.getItem('fdq_settings')||'{}');
    if(s.theme==='dark') document.documentElement.setAttribute('data-theme','dark');
  }catch(e){}
})();
