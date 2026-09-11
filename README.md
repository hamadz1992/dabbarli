# دبّرلي V7
البنية: GitHub Pages + Supabase Free.

الملفات:
- index.html: التطبيق العام.
- admin.html: لوحة الإدارة.
- config.js: ضع فيه SUPABASE_URL و SUPABASE_ANON_KEY.
- supabase_schema.sql: أنشئ به الجداول والسياسات والتخزين.

خطوات الربط:
1) أنشئ مشروعًا مجانيًا في Supabase.
2) افتح SQL Editor والصق محتوى supabase_schema.sql ثم نفّذه.
3) من Authentication > Users أنشئ حساب المدير.
4) انسخ UUID الخاص بالمدير ونفّذ:
   insert into public.admins(user_id) values ('UUID-هنا');
5) من Project Settings > API انسخ Project URL و anon key وضعهما في config.js.
6) ارفع الملفات إلى مستودع GitHub وفعّل GitHub Pages.
7) افتح admin.html لتسجيل الدخول إلى لوحة الإدارة.

ملاحظات:
- مفتاح anon آمن للاستخدام في الواجهة مع RLS؛ لا تضع Service Role Key في الملفات العامة.
- النسخة مصممة لتكون قابلة للتوسع: قاعدة البيانات منفصلة عن الواجهة، مع RLS ورفع صور إلى Storage.
- قبل الإطلاق العام ننفذ مرحلة تشديد الحماية ومكافحة السبام والاختبارات.


## هوية V7
تم اعتماد اسم التطبيق «دبّرلي» وهوية خضراء مع أصفر/ذهبي، مع ملف brand-concept.png كمرجع بصري للشعار.

## إضافات V8 (البرمجة الجديدة)
- صفحة تفاصيل الخدمة (عرض المعلومات): صورة، وصف، أزرار اتصال/واتساب/فيسبوك، وتقييم بالنجوم يُحفظ في جدول ratings عبر Supabase.
- نموذج «أضف خدمتك» أصبح يحتوي: حقل فيسبوك، رفع صورة (تُخزَّن في Storage bucket باسم service-images)، وحقل «اقترح تخصصًا جديدًا» يُرسل إلى جدول category_requests.
- التقييم يستخدم بصمة مجهولة (fingerprint) محفوظة في localStorage لمنع التقييم المتكرر لنفس الخدمة من نفس الجهاز (متوافق مع قيد unique(service_id, fingerprint) في قاعدة البيانات).
- لا حاجة لأي تعديل على supabase_schema.sql — كل الجداول والسياسات المطلوبة (services, ratings, category_requests, storage) كانت جاهزة فيه مسبقًا.
- api.php و admin.php هما بقايا نسخة PHP قديمة (V6) ولم يتم لمسهما؛ النسخة الحالية V7/V8 تعتمد فقط على Supabase (index.html + admin.html + config.js + supabase_schema.sql). يمكن حذفهما لاحقًا إذا تأكدنا أننا لن نعود لاستضافة PHP.


## تم تجهيز Supabase
تم وضع رابط المشروع وPublishable key في `config.js`. لا تضع Secret key داخل الموقع.
