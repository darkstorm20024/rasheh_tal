# رَشّح — منصة التوظيف الذكية

## سبب إعادة البناء
نشر Vercel السابق فشل بسبب: **"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan"**.
كل ملف داخل `api/` (بخلاف الملفات المبدوءة بـ `_`) يُحسب كوظيفة Serverless مستقلة. الحزمة السابقة كانت تحتوي على 15 ملف API.
تم دمج كل المسارات المرتبطة في **4 وظائف فقط** باستخدام معامل استعلام (`?action=` أو `?resource=`) للتفريق بين العمليات داخل كل ملف.

## الهيكل
```
rasheh-talent/
├── index.html              # الصفحة الرئيسية
├── admin.html               # لوحة الإدارة
├── package.json
├── .gitignore
├── supabase_additions.sql   # جدول الآراء الجديد (يُضاف لقاعدة بياناتك الحالية)
├── api/
│   ├── _shared.js           # كود مشترك (لا يُحسب كوظيفة لأنه مبدوء بـ _)
│   ├── me.js                 # GET /api/me
│   ├── auth.js                # POST /api/auth?action=login|register|logout
│   ├── public.js              # GET /api/public?resource=content|articles|testimonials|stats
│   └── admin.js                # كل عمليات الإدارة عبر /api/admin?resource=...
└── public/
    ├── rasheh-logo.png   (ضع شعارك هنا)
    └── favicon.png       (ضع الأيقونة هنا)
```

**الإجمالي: 4 Serverless Functions فقط** (بدل 15)، بعيداً جداً عن حد الـ 12 في خطة Hobby.

## خريطة المسارات الجديدة

| قبل | بعد |
|---|---|
| `POST /api/auth/login` | `POST /api/auth?action=login` |
| `POST /api/auth/register` | `POST /api/auth?action=register` |
| `POST /api/auth/logout` | `POST /api/auth?action=logout` |
| `GET /api/cms/content` | `GET /api/public?resource=content` |
| `GET /api/articles` | `GET /api/public?resource=articles` |
| `GET /api/articles/:slug` | `GET /api/public?resource=articles&slug=...` |
| `GET /api/testimonials` | `GET /api/public?resource=testimonials` |
| `GET /api/stats/public` | `GET /api/public?resource=stats` |
| `GET/PUT /api/admin/settings` | `GET/PUT /api/admin?resource=settings` |
| `GET /api/admin/stats` | `GET /api/admin?resource=stats` |
| `GET /api/admin/clients` | `GET /api/admin?resource=clients` |
| `GET/PUT /api/admin/requests` | `GET/PUT /api/admin?resource=requests` |
| `GET/POST/PUT/DELETE /api/admin/articles` | نفس الأفعال على `/api/admin?resource=articles` |
| `GET/POST/PUT/DELETE /api/admin/testimonials` | نفس الأفعال على `/api/admin?resource=testimonials` |

`GET /api/me` بقي بدون تغيير.

## خطوات التركيب

### 1. قاعدة البيانات
قاعدة بياناتك الحالية (`clients`, `candidates`, `cv_requests`, `placements`, `articles`, `cms_content`) **لم تتغير**.
الإضافة الوحيدة هي جدول `testimonials`. شغّل:
```
supabase_additions.sql
```

### 2. حساب الإدارة
Supabase Dashboard → Authentication → Users → Add User:
- Email: `admin@rasheh.com`
- Password: (اختر كلمة مرور قوية)
- Auto Confirm User: ✅ مفعّل

**لا تُنشئ صفاً في جدول `clients` لهذا الحساب.**

### 3. متغيرات البيئة في Vercel
| المتغير | القيمة |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service_role |
| `SUPABASE_ANON_KEY` | مفتاح anon/public |

### 4. الشعار
ضع في `public/`: `rasheh-logo.png` (145×64) و `favicon.png` (32×32).

### 5. النشر
- لا تضع `vercel.json`.
- Root Directory فارغ (جذر المشروع).
- Node.js Version: `22.x`.
- تحقق أن مجلد `api/` يحتوي فقط على: `_shared.js`, `me.js`, `auth.js`, `public.js`, `admin.js` — أي ملف إضافي هنا يزيد العدّاد.

## المزايا
- تسجيل دخول/تسجيل حساب جديد للشركات من الصفحة الرئيسية.
- زر "لوحة الإدارة" يظهر فقط بعد تسجيل دخول `admin@rasheh.com`.
- لوحة إدارة كاملة: إحصائيات، تحرير محتوى الصفحة الرئيسية، إدارة المقالات، إدارة آراء العملاء، ومتابعة طلبات الشركات.
- جميع استجابات API بصيغة JSON موحدة.
