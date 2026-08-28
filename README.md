# رَشّح — منصة التوظيف الذكية

## الهيكل
```
rasheh-talent/
├── index.html              # الصفحة الرئيسية
├── admin.html               # لوحة الإدارة
├── package.json
├── .gitignore
├── supabase_additions.sql   # جدول الآراء الجديد (يُضاف لقاعدة بياناتك الحالية)
├── api/
│   ├── _shared.js
│   ├── me.js
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   └── logout.js
│   ├── admin/
│   │   ├── stats.js
│   │   ├── clients.js
│   │   ├── requests.js
│   │   ├── settings.js
│   │   ├── articles.js
│   │   └── testimonials.js
│   ├── cms/
│   │   └── content.js
│   ├── articles/
│   │   ├── index.js
│   │   └── [slug].js
│   ├── testimonials/
│   │   └── index.js
│   └── stats/
│       └── public.js
└── public/
    ├── rasheh-logo.png   (ضع شعارك هنا)
    └── favicon.png       (ضع الأيقونة هنا)
```

## خطوات التركيب

### 1. قاعدة البيانات
قاعدة بياناتك الحالية (`clients`, `candidates`, `cv_requests`, `placements`, `articles`, `cms_content`) **لم تتغير**.
الإضافة الوحيدة هي جدول `testimonials` (الآراء). شغّل الملف التالي في Supabase SQL Editor:
```
supabase_additions.sql
```

### 2. حساب الإدارة
في Supabase Dashboard → Authentication → Users → Add User:
- Email: `admin@rasheh.com`
- Password: (اختر كلمة مرور قوية)
- Auto Confirm User: ✅ مفعّل

**لا تُنشئ صفاً في جدول `clients` لهذا الحساب** — الكود يتعرف على الإدارة تلقائياً بالبريد فقط.

### 3. متغيرات البيئة في Vercel
| المتغير | القيمة |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service_role |
| `SUPABASE_ANON_KEY` | مفتاح anon/public |

> ملاحظة: بريد الإدارة `admin@rasheh.com` مكتوب مباشرة في `api/_shared.js` (متغير `ADMIN_EMAIL`)، لا حاجة لإضافته كمتغير بيئة.

### 4. الشعار
ضع في مجلد `public/`:
- `rasheh-logo.png` (145×64 بكسل)
- `favicon.png` (32×32 بكسل)

### 5. النشر
- لا تضع ملف `vercel.json` — الإعداد التلقائي كافٍ.
- تأكد أن Root Directory في Vercel فارغ (جذر المشروع).
- Node.js Version: `22.x`.

## المزايا
- تسجيل دخول/تسجيل حساب جديد للشركات من الصفحة الرئيسية.
- زر "لوحة الإدارة" يظهر فقط بعد تسجيل دخول `admin@rasheh.com`.
- لوحة إدارة كاملة: إحصائيات، تحرير محتوى الصفحة الرئيسية، إدارة المقالات، إدارة آراء العملاء، ومتابعة طلبات الشركات.
- جميع استجابات API بصيغة JSON موحدة لتجنب أخطاء `JSON.parse`.
