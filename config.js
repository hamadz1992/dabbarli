// Supabase connection for دبّرلي
window.SUPABASE_URL = "https://rrybfflettigvfgpfbyi.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_JFoAUuoK0X-eGsQ8xNNnCA_h1Y865Qm";

// المعالج الفعلي لنموذج إضافة الخدمة.
// هذا المعالج يعمل قبل المعالج الموجود داخل index.html، لذلك يجب أن تكون
// معالجة الصورة هنا أيضًا حتى لا يتم رفع الملف الأصلي إلى Supabase.
function prepareServiceImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        // نجهز نسخة مناسبة للويب: حد أقصى 1200×800 مع الحفاظ على النسبة.
        const maxWidth = 1200;
        const maxHeight = 800;
        const scale = Math.min(
          maxWidth / img.naturalWidth,
          maxHeight / img.naturalHeight,
          1
        );

        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر تجهيز الصورة'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('تعذر ضغط الصورة'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          0.82
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة الصورة'));
    };

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
    setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    showToast('تعذر الاتصال بقاعدة البيانات');
    return;
  }

  const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

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

      // حجم الملف الأصلي قبل المعالجة.
      if (file.size > 10 * 1024 * 1024) {
        showToast('حجم الصورة الأصلية يجب ألا يتجاوز 10 ميغابايت');
        return;
      }

      let processedImage;
      try {
        processedImage = await prepareServiceImage(file);
      } catch (error) {
        console.error('Image processing error:', error);
        showToast('تعذر تجهيز الصورة');
        return;
      }

      // Supabase يستقبل النسخة المعالجة فقط، وليس الصورة الأصلية.
      if (processedImage.size > 5 * 1024 * 1024) {
        showToast('تعذر ضغط الصورة بالحجم المطلوب');
        return;
      }

      const path = `services/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await client.storage
        .from('service-images')
        .upload(path, processedImage, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp'
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

    const { error: insertError } = await client
      .from('services')
      .insert(row);

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
