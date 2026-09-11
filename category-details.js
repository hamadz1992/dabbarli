(function(){
  const groups={
    'خدمات منزلية':[
      ['كهربائي','⚡'],['سباك','🚰'],['نجار','🪚'],['حداد','🔨'],['بناء','🧱'],['دهان','🎨'],['جباس','🏠'],['ألمنيوم','🪟'],['بلاط','◼️'],['جبس','✨'],['تكييف وتبريد','❄️'],['أجهزة منزلية','🔌'],['هواتف','📱'],['حواسيب','💻'],['تنظيف','🧹'],['مكافحة حشرات','🦟'],['خياطة','🧵'],['إصلاح أحذية','👞']
    ],
    'النقل والمركبات':[
      ['سيارات أجرة','🚕'],['سيارات نقل','🚐'],['شاحنات نقل','🚚'],['شاحنات كبيرة','🚛'],['شاحنات الماء','💧'],['شاحنات الغاز','🔥'],['جرارات','🚜'],['جرافات','🏗️'],['حفارات','🚧'],['رافعات','🏗️'],['شاحنات تبريد','❄️'],['نقل البضائع','📦'],['نقل الأثاث','🛋️'],['سائق خاص','👨‍✈️'],['سفريات','🚌'],['ميكانيكي','🔧'],['كهرباء سيارات','⚡'],['تصليح سيارات','🛠️'],['تصليح شاحنات','🔩'],['غسيل سيارات','🧽'],['زيوت','🛢️'],['إطارات','🛞'],['قطع غيار','⚙️'],['بيع سيارات','🚘'],['كراء سيارات','🔑'],['دراجات نارية','🏍️'],['إصلاح دراجات','🔩']
    ],
    'العقارات':[
      ['منازل للكراء','🏠'],['منازل للبيع','🏡'],['شقق للكراء','🏢'],['شقق للبيع','🏙️'],['محلات للكراء','🏪'],['محلات للبيع','🏬'],['مكاتب','💼'],['مستودعات','🏭'],['أراضي','🌳'],['أراضي فلاحية','🌾'],['غرف للكراء','🛏️']
    ],
    'الصحة':[
      ['طبيب عام','🩺'],['أطفال','👶'],['أسنان','🦷'],['عيون','👁️'],['جلدية','🧴'],['قلب','❤️'],['نساء وتوليد','🤰'],['مختصون','⚕️'],['ممرضون','👨‍⚕️'],['قابلات','🤱'],['مخابر','🧪'],['علاج طبيعي','🧘'],['صيدليات','💊'],['عيادات','🏥']
    ],
    'الزراعة والحدائق':[
      ['طبيب بيطري','🐄'],['جرارات','🚜'],['آلات فلاحية','⚙️'],['كراء آلات','🔧'],['حرث','🌱'],['حصاد','🌾'],['حفر آبار','💧'],['أعلاف','🐑'],['بذور','🌱'],['أسمدة','🧪'],['معدات فلاحية','🧰'],['حدائق وبستنة','🌿']
    ],
    'التكنولوجيا':[
      ['هواتف','📱'],['حواسيب','💻'],['صيانة حواسيب','🛠️'],['برمجة','💻'],['تصميم مواقع','🌐'],['شبكات وإنترنت','📡'],['كاميرات مراقبة','📷'],['صيانة إلكترونيات','🔌'],['طباعة وتصميم','🖨️'],['خدمات رقمية','📲']
    ],
    'الدروس والتعليم':[
      ['دروس ابتدائي','📚'],['دروس متوسط','📘'],['دروس ثانوي','📖'],['تحضير بكالوريا','🎓'],['لغات','🗣️'],['رياضيات','➗'],['فيزياء','🔬'],['كيمياء','🧪'],['إعلام آلي','💻'],['دروس خصوصية','✏️']
    ],
    'الجمال والعناية':[
      ['حلاقة رجالية','💈'],['تجميل نسائي','💄'],['تصفيف شعر','💇'],['مكياج','💋'],['عناية بالبشرة','✨'],['عناية بالأظافر','💅'],['حمام وعناية','🧖'],['عطور','🌸'],['حجامة','🩹']
    ],
    'خدمات أخرى':[
      ['خدمات إدارية','📋'],['استخراج وثائق','📄'],['كتابة عرائض','✍️'],['ترجمة','🌐'],['محاسبة','🧾'],['خدمات تأمين','🛡️'],['استشارات','💼'],['خدمات قانونية','⚖️'],['خدمات عقود','📝'],['خدمات مالية','💰'],['خدمات مهنية','🧑‍💼'],['خدمات عامة','✨']
    ]
  };
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const services=()=>window.__dabbarliServices||[];
  function renderGroup(category){
    const items=groups[category];
    if(!items)return false;
    const list=services();
    const html=items.map(([name,icon])=>{
      const count=list.filter(s=>String(s.specialty||'').trim()===name||String(s.name||'').trim()===name).length;
      return '<button type="button" class="category-detail-item" data-generic-specialty="'+esc(name)+'">'+
        '<div class="category-detail-thumb category-detail-design" aria-hidden="true">'+icon+'</div>'+ 
        '<span class="category-detail-name">'+esc(name)+(count?'<small class="category-detail-count">'+count+' خدمة</small>':'')+'</span>'+ 
        '<span class="category-detail-arrow">‹</span></button>';
    }).join('');
    content.innerHTML='<div class="page-card"><div class="section-head"><h2>'+esc(category)+'</h2><button class="see-all" id="genericCategoryHome">‹ الرئيسية</button></div><div class="category-detail-list">'+html+'</div></div>';
    document.getElementById('genericCategoryHome')?.addEventListener('click',()=>home());
    content.querySelectorAll('[data-generic-specialty]').forEach(b=>b.addEventListener('click',()=>renderSpecialty(category,b.dataset.genericSpecialty)));
    return true;
  }
  function renderSpecialty(category,name){
    const list=services().filter(s=>String(s.specialty||'').trim()===name||String(s.name||'').trim()===name);
    const html=list.length?list.map(s=>card(s)).join(''):'<div class="empty">لا توجد خدمات منشورة في هذا التخصص بعد.</div>';
    content.innerHTML='<div class="page-card"><div class="section-head"><h2>'+esc(name)+'</h2><button class="see-all" id="genericBack">‹ '+esc(category)+'</button></div><div class="services">'+html+'</div></div>';
    document.getElementById('genericBack')?.addEventListener('click',()=>renderGroup(category));
  }
  window.renderCategoryDetails=renderGroup;
  window.renderCategorySpecialty=renderSpecialty;
  function wrap(){
    if(typeof window.category!=='function'){setTimeout(wrap,100);return}
    if(window.category.__genericDetailsWrapped)return;
    const original=window.category;
    const wrapped=function(type){
      const t=String(type||'').trim();
      if(groups[t]){window.__dabbarliServices=services();renderGroup(t);return;}
      return original.apply(this,arguments);
    };
    wrapped.__genericDetailsWrapped=true;
    window.category=wrapped;
  }
  wrap();
  setTimeout(wrap,300);
  setTimeout(wrap,1000);
})();