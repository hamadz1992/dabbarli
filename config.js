// Supabase connection for دبّرلي
window.SUPABASE_URL = "https://rrybfflettigvfgpfbyi.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_JFoAUuoK0X-eGsQ8xNNnCA_h1Y865Qm";

// معالجة نموذج إضافة الخدمة مع رفع الصورة فعليًا إلى Supabase Storage.
// نضع المعالج في مرحلة capture حتى يتغلب على المعالج القديم داخل index.html
// الذي كان يتجاهل خطأ رفع الصورة ويضيف الخدمة بالصورة الافتراضية.
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
    setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    showToast('تعذر الاتصال بقاعدة البيانات');
    return;
  }

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const button = form.querySelector('button[type="submit"], button.primary');
  if (button) {
    button.disabled = true;
    button.textContent = 'جاري الإرسال...';
  }

  try {
    const data = new FormData(form);
    const row = {
      name: String(data.get('name') || '').trim(),
      category: String(data.get('category') || '').trim(),
      specialty: String(data.get('specialty') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      whatsapp: String(data.get('whatsapp') || '').trim(),
      facebook: String(data.get('facebook') || '').trim(),
      area: String(data.get('area') || '').trim(),
      details: String(data.get('details') || '').trim(),
      status: 'pending'
    };

    const file = data.get('image');

    if (file && file instanceof File && file.size > 0) {
      if (!file.type.startsWith('image/')) {
        showToast('الملف المختار ليس صورة');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب ألا يتجاوز 5 ميغابايت');
        return;
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `services/${crypto.randomUUID()}.${ext || 'jpg'}`;

      const { error: uploadError } = await client.storage
        .from('service-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        showToast('تعذر رفع الصورة، حاول مرة أخرى');
        return;
      }

      const { data: publicData } = client.storage
        .from('service-images')
        .getPublicUrl(path);

      if (!publicData?.publicUrl) {
        showToast('تعذر الحصول على رابط الصورة');
        return;
      }

      row.image_url = publicData.publicUrl;
    }

    const { error: insertError } = await client.from('services').insert(row);

    if (insertError) {
      console.error('Service insert error:', insertError);
      showToast('تعذر إرسال الخدمة للمراجعة');
      return;
    }

    const newType = String(data.get('newType') || '').trim();
    if (newType) {
      const { error: requestError } = await client
        .from('category_requests')
        .insert({ name: newType });
      if (requestError) console.error('Category request error:', requestError);
    }

    form.reset();
    showToast('تم إرسال الخدمة للمراجعة');
  } catch (error) {
    console.error('Submit service error:', error);
    showToast('حدث خطأ، حاول مرة أخرى');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'إرسال للمراجعة';
    }
  }
}, true);
