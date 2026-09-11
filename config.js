// Supabase connection for دبّرلي
window.SUPABASE_URL = "https://rrybfflettigvfgpfbyi.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_JFoAUuoK0X-eGsQ8xNNnCA_h1Y865Qm";

async function prepareServiceImage(file) {
  let source = file;
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  const isHeic = type.includes('heic') || type.includes('heif') || /\.(heic|heif)$/.test(name);
  if (isHeic) {
    if (typeof window.heic2any !== 'function') throw new Error('تعذر تحميل محول HEIC');
    try {
      const converted = await window.heic2any({blob:file,toType:'image/jpeg',quality:0.9});
      source = Array.isArray(converted) ? converted[0] : converted;
      if (!source) throw new Error('تعذر تحويل صورة HEIC');
    } catch (error) {
      console.error('HEIC conversion error:', error);
      throw new Error('تعذر تحويل صورة HEIC. جرّب اختيار الصورة مرة أخرى');
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(source);
    let finished = false;
    const cleanup = () => { if (!finished) { finished = true; URL.revokeObjectURL(objectUrl); } };
    img.onload = () => {
      try {
        const maxWidth = 1000, maxHeight = 667;
        const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('المتصفح لا يدعم معالجة الصور');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const qualities = [0.82,0.72,0.62,0.52,0.42];
        const encode = (index) => {
          if (index >= qualities.length) { cleanup(); reject(new Error('الصورة بعد الضغط ما زالت كبيرة')); return; }
          canvas.toBlob((blob) => {
            if (blob && blob.size <= 4.5 * 1024 * 1024) { cleanup(); resolve(blob); return; }
            encode(index + 1);
          }, 'image/webp', qualities[index]);
        };
        encode(0);
      } catch (error) { cleanup(); reject(error); }
    };
    img.onerror = () => { cleanup(); reject(new Error('تعذر قراءة الصورة بعد تحويلها')); };
    img.src = objectUrl;
  });
}

document.addEventListener('submit', async function (event) {
  const form = event.target;
  if (!form || form.id !== 'addForm') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const toastEl = document.getElementById('toast');
  const showToast = (message) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3200);
  };
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) { showToast('تعذر الاتصال بقاعدة البيانات'); return; }
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const button = form.querySelector('button[type="submit"], button.primary');
  if (button) { button.disabled = true; button.textContent = 'جاري الإرسال...'; }
  try {
    const data = new FormData(form);
    const row = {
      name: String(data.get('name') || '').trim(), category: String(data.get('category') || '').trim(), specialty: String(data.get('specialty') || '').trim(),
      phone: String(data.get('phone') || '').trim(), whatsapp: String(data.get('whatsapp') || '').trim(), facebook: String(data.get('facebook') || '').trim(),
      area: String(data.get('area') || '').trim(), details: String(data.get('details') || '').trim(), status: 'pending'
    };
    const file = data.get('image');
    const fileName = String(file?.name || '').toLowerCase();
    const fileType = String(file?.type || '').toLowerCase();
    const isKnownImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif)$/.test(fileName);
    if (file && file instanceof File && file.size > 0) {
      if (!isKnownImage) { showToast('الملف المختار ليس صورة مدعومة'); return; }
      if (file.size > 20 * 1024 * 1024) { showToast('حجم الصورة الأصلية يجب ألا يتجاوز 20 ميغابايت'); return; }
      let processedImage;
      try { processedImage = await prepareServiceImage(file); }
      catch (error) { console.error('Image processing error:', error); showToast(error?.message || 'تعذر تجهيز الصورة'); return; }
      const path = `services/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await client.storage.from('service-images').upload(path, processedImage, {cacheControl:'31536000',upsert:false,contentType:'image/webp'});
      if (uploadError) { console.error('Image upload error:', uploadError); showToast('تعذر رفع الصورة: ' + (uploadError.message || 'خطأ غير معروف')); return; }
      const { data: publicData } = client.storage.from('service-images').getPublicUrl(path);
      if (!publicData?.publicUrl) { showToast('تعذر الحصول على رابط الصورة'); return; }
      row.image_url = publicData.publicUrl;
    }
    const { error: insertError } = await client.from('services').insert(row);
    if (insertError) { console.error('Service insert error:', insertError); showToast('تعذر إرسال الخدمة للمراجعة'); return; }
    const newType = String(data.get('newType') || '').trim();
    if (newType) {
      const { error: requestError } = await client.from('category_requests').insert({name:newType});
      if (requestError) console.error('Category request error:', requestError);
    }
    form.reset();
    showToast('تم إرسال الخدمة للمراجعة');
  } catch (error) { console.error('Submit service error:', error); showToast('حدث خطأ: ' + (error?.message || 'حاول مرة أخرى')); }
  finally { if (button) { button.disabled = false; button.textContent = 'إرسال للمراجعة'; } }
}, true);

(function improveServiceImageDisplay(){
  const style = document.createElement('style');
  style.textContent = `
    .service-img{object-fit:cover!important;object-position:center!important;background:#eee;cursor:pointer}
    .detail-img{object-fit:cover!important;object-position:center!important;background:#eee;cursor:zoom-in}
    .image-lightbox{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:18px}
    .image-lightbox img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:8px}
    .image-lightbox .close-image{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:30px;line-height:1}
    .rating-box{margin-top:20px;padding:16px;border:1px solid #e7ede9;border-radius:18px;background:#f3faf6;text-align:right}
    .rating-box-title{font-weight:800;font-size:16px;margin-bottom:8px}
    .rating-choices{display:flex;direction:ltr;gap:5px;margin:7px 0 10px}
    .rating-choice{font-size:31px;color:#c9cec9;cursor:pointer;padding:0 2px;border:0;background:transparent}
    .rating-choice.selected{color:#e2a400}
    .rating-submit{width:100%;margin-top:5px}
    .detail-link{display:flex;align-items:center;justify-content:center;width:100%;box-sizing:border-box;margin-top:10px;padding:12px 14px;border-radius:10px;background:#7440d6;color:#fff!important;font-weight:700;text-decoration:none!important}
  `;
  document.head.appendChild(style);
})();

(function addDetailFeatures(){
  let currentServiceId = null;
  const escHtml = (value) => String(value ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const getFingerprint = () => {
    let fp = localStorage.getItem('dabbarli_rating_fp');
    if (!fp) { fp = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); localStorage.setItem('dabbarli_rating_fp', fp); }
    return fp;
  };
  const openImage = (src) => {
    const old = document.querySelector('.image-lightbox');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'image-lightbox';
    box.innerHTML = `<button class="close-image" aria-label="إغلاق">×</button><img src="${escHtml(src)}" alt="الصورة بالحجم الكامل">`;
    box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('close-image')) box.remove(); });
    document.body.appendChild(box);
  };
  const setupImage = (img) => {
    if (!img || img.dataset.lightboxReady) return;
    img.dataset.lightboxReady = '1';
    img.addEventListener('click', () => openImage(img.currentSrc || img.src));
  };
  const setupDetailsText = (detail) => {
    const p = detail.querySelector('.detail > p, .detail p');
    if (!p || p.dataset.linksReady) return;
    p.dataset.linksReady = '1';
    const text = p.textContent || '';
    const urlRe = /(https?:\/\/[^\s]+)/g;
    let last = 0, html = '', match;
    while ((match = urlRe.exec(text))) {
      html += escHtml(text.slice(last, match.index));
      const cleanUrl = match[0].replace(/[),.،]+$/,'');
      html += `<a class="detail-link" href="${escHtml(cleanUrl)}" target="_blank" rel="noopener">🔗 فتح الرابط</a>`;
      last = match.index + match[0].length;
    }
    if (html) { html += escHtml(text.slice(last)); p.innerHTML = html; }
  };
  const refreshRating = async (detail, ratingClient) => {
    if (!currentServiceId) return;
    try {
      const {data, error} = await ratingClient.from('ratings').select('rating').eq('service_id', currentServiceId);
      if (error || !data) return;
      const count = data.length;
      const avg = count ? data.reduce((sum,row)=>sum+Number(row.rating||0),0)/count : 0;
      const row = detail.querySelector('.detail-current-rating');
      if (row) row.innerHTML = `<span class="star">★</span><span>${avg.toFixed(1)} (${count})</span>`;
    } catch (error) { console.error('Rating refresh error:', error); }
  };
  const ensureRating = async (detail) => {
    if (!currentServiceId || detail.querySelector('.rating-box')) return;
    const box = document.createElement('div');
    box.className = 'rating-box';
    box.innerHTML = `<div class="rating-box-title">قيّم هذه الخدمة</div><div class="rating-choices" aria-label="اختر التقييم"><button type="button" class="rating-choice" data-rating="1">★</button><button type="button" class="rating-choice" data-rating="2">★</button><button type="button" class="rating-choice" data-rating="3">★</button><button type="button" class="rating-choice" data-rating="4">★</button><button type="button" class="rating-choice" data-rating="5">★</button></div><button type="button" class="primary rating-submit" disabled>إرسال التقييم</button><div class="muted rating-status"></div>`;
    const actions = detail.querySelector('.actions');
    detail.insertBefore(box, actions || null);
    let selected = 0;
    box.querySelectorAll('.rating-choice').forEach(btn => btn.addEventListener('click', () => {
      selected = Number(btn.dataset.rating);
      box.querySelectorAll('.rating-choice').forEach(x => x.classList.toggle('selected', Number(x.dataset.rating) <= selected));
      box.querySelector('.rating-submit').disabled = false;
    }));
    const submit = box.querySelector('.rating-submit');
    const status = box.querySelector('.rating-status');
    const ratingClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    try {
      const {data: mine} = await ratingClient.from('ratings').select('rating').eq('service_id', currentServiceId).eq('fingerprint', getFingerprint()).limit(1);
      if (mine?.length) { status.textContent = 'لقد قيّمت هذه الخدمة من قبل.'; box.querySelectorAll('.rating-choice').forEach(x => x.disabled = true); }
    } catch (error) { console.error('Rating check error:', error); }
    submit.addEventListener('click', async () => {
      if (!selected) return;
      submit.disabled = true;
      status.textContent = 'جاري إرسال التقييم...';
      const {error} = await ratingClient.from('ratings').insert({service_id:currentServiceId,rating:selected,fingerprint:getFingerprint()});
      if (error) {
        status.textContent = error.code === '23505' ? 'لقد قيّمت هذه الخدمة من قبل.' : 'تعذر إرسال التقييم، حاول مرة أخرى.';
        submit.disabled = error.code === '23505';
        return;
      }
      status.textContent = 'شكرًا لك، تم تسجيل تقييمك.';
      box.querySelectorAll('.rating-choice').forEach(x => x.disabled = true);
      await refreshRating(detail, ratingClient);
    });
    await refreshRating(detail, ratingClient);
  };
  const enhance = () => {
    const detail = document.querySelector('.detail');
    if (!detail) return;
    setupImage(detail.querySelector('.detail-img'));
    setupDetailsText(detail);
    if (!detail.querySelector('.detail-current-rating')) {
      const rows = detail.querySelectorAll('.rating-row');
      const row = rows[rows.length - 1];
      if (row) row.classList.add('detail-current-rating');
    }
    ensureRating(detail);
  };
  const wrapShowDetail = () => {
    if (typeof window.showDetail !== 'function' || window.showDetail.__dabbarliWrapped) return;
    const original = window.showDetail;
    const wrapped = function(id){ currentServiceId = String(id); const result = original.apply(this, arguments); setTimeout(enhance, 0); setTimeout(enhance, 120); return result; };
    wrapped.__dabbarliWrapped = true;
    window.showDetail = wrapped;
  };
  const wrapperTimer = setInterval(() => {
    wrapShowDetail();
    if (typeof window.showDetail === 'function' && window.showDetail.__dabbarliWrapped) clearInterval(wrapperTimer);
  }, 50);
  document.addEventListener('click', event => {
    const button = event.target.closest('button[onclick*="showDetail"]');
    if (!button) return;
    const match = String(button.getAttribute('onclick') || '').match(/showDetail\(['"]([^'"]+)['"]\)/);
    if (match) currentServiceId = match[1];
    setTimeout(enhance, 0);
  }, true);
  const observer = new MutationObserver(enhance);
  observer.observe(document.getElementById('content') || document.body, {childList:true,subtree:true});
  window.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.image-lightbox')?.remove(); });
})();
