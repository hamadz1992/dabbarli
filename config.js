// Supabase connection for دبّرلي
window.SUPABASE_URL = "https://rrybfflettigvfgpfbyi.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_JFoAUuoK0X-eGsQ8xNNnCA_h1Y865Qm";

(function(){
  const style=document.createElement('style');
  style.textContent=`
    .detail-link{display:flex!important;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-height:46px;margin:10px 0 0;padding:12px 14px;border-radius:10px;background:#0b8f58;color:#fff!important;font-weight:800;text-decoration:none!important}
    .detail-link:hover{filter:brightness(.95)}
    .rating-box{margin-top:20px;padding:16px;border:1px solid #e7ede9;border-radius:18px;background:#f3faf6;text-align:right}
    .rating-box-title{font-weight:800;font-size:16px;margin-bottom:8px}
    .rating-choices{display:flex;direction:ltr;gap:5px;margin:7px 0 10px}
    .rating-choice{font-size:31px;color:#c9cec9;cursor:pointer;padding:0 2px;border:0;background:transparent}
    .rating-choice.selected{color:#e2a400}
    .rating-submit{width:100%;margin-top:5px}
    .link-field{padding:12px;border:1px solid #dce7e1;border-radius:14px;background:#f7fbf9}
    .link-field label{font-weight:800}
  `;
  document.head.appendChild(style);
  let currentServiceId=null;
  const fingerprint=()=>{let x=localStorage.getItem('dabbarli_rating_fp');if(!x){x=crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();localStorage.setItem('dabbarli_rating_fp',x)}return x};
  function makeLink(url){const a=document.createElement('a');a.className='detail-link stored-detail-link';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='🔗 فتح الرابط';return a}
  function addStoredLink(detail){
    if(detail.querySelector('.stored-detail-link'))return;
    let service=null;try{service=window.__dabbarliServices?.find(x=>String(x.id)===String(currentServiceId))}catch(e){}
    const url=String(service?.link||'').trim();
    const p=detail.querySelector('.detail > p');
    if(url&&p)detail.insertBefore(makeLink(url),p);
  }
  async function addRating(detail){
    if(!currentServiceId||detail.querySelector('.rating-box'))return;
    const box=document.createElement('div');box.className='rating-box';
    box.innerHTML='<div class="rating-box-title">قيّم هذه الخدمة</div><div class="rating-choices"><button type="button" class="rating-choice" data-r="1">★</button><button type="button" class="rating-choice" data-r="2">★</button><button type="button" class="rating-choice" data-r="3">★</button><button type="button" class="rating-choice" data-r="4">★</button><button type="button" class="rating-choice" data-r="5">★</button></div><button type="button" class="primary rating-submit" disabled>إرسال التقييم</button><div class="muted rating-status"></div>';
    const actions=detail.querySelector('.actions');detail.insertBefore(box,actions||null);
    const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);let selected=0;
    box.querySelectorAll('.rating-choice').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.r);box.querySelectorAll('.rating-choice').forEach(x=>x.classList.toggle('selected',Number(x.dataset.r)<=selected));box.querySelector('.rating-submit').disabled=false});
    const status=box.querySelector('.rating-status'),submit=box.querySelector('.rating-submit');
    try{const {data}=await c.from('ratings').select('rating').eq('service_id',currentServiceId).eq('fingerprint',fingerprint()).limit(1);if(data?.length){status.textContent='لقد قيّمت هذه الخدمة من قبل.';box.querySelectorAll('.rating-choice').forEach(x=>x.disabled=true)}}catch(e){}
    try{const {data}=await c.from('ratings').select('rating').eq('service_id',currentServiceId);if(data){const avg=data.length?data.reduce((a,x)=>a+Number(x.rating||0),0)/data.length:0;const row=detail.querySelector('.rating-row');if(row)row.innerHTML='<span class="star">★</span><span>'+avg.toFixed(1)+' ('+data.length+')</span>'}}catch(e){}
    submit.onclick=async()=>{if(!selected)return;submit.disabled=true;status.textContent='جاري إرسال التقييم...';const {error}=await c.from('ratings').insert({service_id:currentServiceId,rating:selected,fingerprint:fingerprint()});if(error){status.textContent=error.code==='23505'?'لقد قيّمت هذه الخدمة من قبل.':'تعذر إرسال التقييم، حاول مرة أخرى.';return}status.textContent='شكرًا لك، تم تسجيل تقييمك.';box.querySelectorAll('.rating-choice').forEach(x=>x.disabled=true);const {data}=await c.from('ratings').select('rating').eq('service_id',currentServiceId);if(data){const avg=data.reduce((a,x)=>a+Number(x.rating||0),0)/data.length;const row=detail.querySelector('.rating-row');if(row)row.innerHTML='<span class="star">★</span><span>'+avg.toFixed(1)+' ('+data.length+')</span>'}};
  }
  function ensureLinkField(){
    const form=document.getElementById('addForm');
    if(!form||form.querySelector('[name="link"]'))return;
    const details=form.querySelector('[name="details"]');
    const field=document.createElement('div');field.className='field link-field';
    field.innerHTML='<label>رابط الصفحة / الموقع</label><input name="link" type="url" placeholder="https://...">';
    if(details){const detailsField=details.closest('.field');if(detailsField)detailsField.parentNode.insertBefore(field,detailsField);else form.appendChild(field)}else form.appendChild(field);
  }
  function enhance(){const detail=document.querySelector('.detail');if(detail)addStoredLink(detail);if(detail)addRating(detail);ensureLinkField()}
  document.addEventListener('click',e=>{const b=e.target.closest('button[onclick*="showDetail"]');if(!b)return;const m=String(b.getAttribute('onclick')||'').match(/showDetail\(['"]([^'"]+)['"]\)/);if(m)currentServiceId=m[1];setTimeout(enhance,50);setTimeout(enhance,300)},true);
  const observer=new MutationObserver(()=>{setTimeout(enhance,20);setTimeout(enhance,150)});observer.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
  setTimeout(ensureLinkField,300);
})();
