// Supabase connection for دبّرلي
window.SUPABASE_URL = "https://rrybfflettigvfgpfbyi.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_JFoAUuoK0X-eGsQ8xNNnCA_h1Y865Qm";

// تجهيز الصور قبل رفعها إلى Supabase.
// يدعم JPG / PNG / WEBP وكذلك HEIC / HEIF من هواتف Android و iPhone.
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

// تحسين عرض صور الخدمات دون تغيير بنية الصفحة.
// الصورة تملأ الإطار بشكل متناسق بدل ظهور مساحات بيضاء كبيرة حولها.
(function improveServiceImageDisplay(){
  const style = document.createElement('style');
  style.textContent = `
    .service-img{object-fit:cover!important;object-position:center!important;background:#eee}
    .detail-img{object-fit:cover!important;object-position:center!important;background:#eee}
    .detail-img{cursor:zoom-in}
    .image-lightbox{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
    .image-lightbox img{max-width:96vw;max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
    .image-lightbox .image-close{position:absolute;top:16px;right:16px;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.94);color:#122019;font-size:30px;line-height:1;cursor:pointer}
  `;
  document.head.appendChild(style);
})();

// عند الضغط على صورة الخدمة داخل "عرض المعلومات"، افتحها بالحجم الكامل.
document.addEventListener('click', function(event){
  const image = event.target.closest('.detail-img');
  if (!image) return;
  event.preventDefault();
  let box = document.querySelector('.image-lightbox');
  if (!box) {
    box = document.createElement('div');
    box.className = 'image-lightbox';
    box.innerHTML = '<button class="image-close" aria-label="إغلاق">×</button><img alt="">';
    document.body.appendChild(box);
    box.addEventListener('click', function(e){
      if (e.target === box || e.target.classList.contains('image-close')) box.remove();
    });
  }
  box.querySelector('img').src = image.currentSrc || image.src;
  box.querySelector('img').alt = image.alt || 'صورة الخدمة';
});

document.addEventListener('keydown', function(event){
  if (event.key === 'Escape') document.querySelector('.image-lightbox')?.remove();
});
