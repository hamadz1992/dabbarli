(function(){
try{
  if(!Array.isArray(window.__dabbarliPublicServices)){
    document.write('<script src="public-services.js?v=20260912-38"><\/script>');
  }
}catch(e){console.error('public directory load failed',e)}
var transport=['سيارات أجرة','سيارات نقل','شاحنات نقل','شاحنات كبيرة','شاحنات الماء','شاحنات الغاز','جرارات','جرافات','حفارات','رافعات','شاحنات تبريد','نقل البضائع','نقل الأثاث','سائق خاص','سفريات','ميكانيكي','كهرباء سيارات','تصليح سيارات','تصليح شاحنات','غسيل سيارات','زيوت','إطارات','قطع غيار','بيع سيارات','كراء سيارات','دراجات نارية','إصلاح دراجات'];
var icons={'سيارات أجرة':'🚕','سيارات نقل':'🚐','شاحنات نقل':'🚚','شاحنات كبيرة':'🚛','شاحنات الماء':'💧','شاحنات الغاز':'🔥','جرارات':'🚜','جرافات':'🏗️','حفارات':'🚧','رافعات':'🏗️','شاحنات تبريد':'❄️','نقل البضائع':'📦','نقل الأثاث':'🛋️','سائق خاص':'👨‍✈️','سفريات':'🚌','ميكانيكي':'🔧','كهرباء سيارات':'⚡','تصليح سيارات':'🛠️','تصليح شاحنات':'🔩','غسيل سيارات':'🧽','زيوت':'🛢️','إطارات':'🛞','قطع غيار':'⚙️','بيع سيارات':'🚘','كراء سيارات':'🔑','دراجات نارية':'🏍️','إصلاح دراجات':'🔩'};
function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]})}
function getServices(){return Array.isArray(window.__dabbarliServices)?window.__dabbarliServices:[]}
function renderTransportDetails(){var data=getServices();var html=transport.map(function(n){var c=data.filter(function(s){return String(s.specialty||'').trim()===n||String(s.name||'').trim()===n}).length;return '<button type="button" class="category-detail-item" data-transport="'+esc(n)+'"><div class="category-detail-thumb category-detail-design">'+(icons[n]||'🚚')+'</div><span class="category-detail-name">'+esc(n)+(c?'<small class="category-detail-count">'+c+' خدمة</small>':'')+'</span><span class="category-detail-arrow">‹</span></button>'}).join('');content.innerHTML='<div class="page-card"><div class="section-head"><h2>النقل والمركبات</h2><button class="see-all" id="transportHome">‹ الرئيسية</button></div><div class="category-detail-list">'+html+'</div></div>';var h=document.getElementById('transportHome');if(h)h.onclick=function(){home()};content.querySelectorAll('[data-transport]').forEach(function(b){b.onclick=function(){showTransportSpecialty(b.dataset.transport)}})}
function showTransportSpecialty(n){var list=getServices().filter(function(s){return String(s.specialty||'').trim()===n||String(s.name||'').trim()===n});content.innerHTML='<div class="page-card"><div class="section-head"><h2>'+esc(n)+'</h2><button class="see-all" id="transportBack">‹ النقل والمركبات</button></div><div class="services">'+(list.length?list.map(function(s){return card(s)}).join(''):'<div class="empty">لا توجد خدمات منشورة في هذا التخصص بعد.</div>')+'</div></div>';var b=document.getElementById('transportBack');if(b)b.onclick=renderTransportDetails}
window.renderTransportDetails=renderTransportDetails;window.showTransportSpecialty=showTransportSpecialty;
function wrapSearch(){
  if(typeof window.searchPage!=='function'){setTimeout(wrapSearch,50);return}
  if(window.searchPage.__public38)return;
  var original=window.searchPage;
  window.searchPage=function(q){
    return Promise.resolve(typeof window.loadServices==='function'?window.loadServices():null).then(function(){window.__dabbarliServices=window.__dabbarliServices||[];return original(q)})
  };
  window.searchPage.__public38=true;
}
wrapSearch();
})();