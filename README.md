# رَشّح — منصة التوظيف الذكية

## الهيكل
```
rasheh-talent/
├── package.json / .gitignore / supabase_additions.sql / supabase_plans.sql
├── api/                       (5 Serverless Functions فقط)
│   ├── _shared.js              (غير محسوب، مبدوء بـ _)
│   ├── me.js
│   ├── auth.js                  ?action=login|register|logout
│   ├── public.js                 ?resource=content|articles|testimonials|stats|candidates|request-candidate|my-requests
│   ├── admin.js                   ?resource=stats|clients|requests|settings|articles|testimonials|plans
│   └── payments.js                 ?resource=plans|checkout-stripe|webhook-stripe|checkout-paypal|paypal-capture|bank-transfer|my-payments|admin-payments
└── public/
    ├── index.html               الصفحة الرئيسية
    ├── candidates.html          تصفح المرشحين (للشركات المسجّلة)
    ├── pricing.html             صفحة الباقات والأسعار (عامة)
    ├── billing.html             حساب الشركة والدفع
    ├── admin.html               لوحة الإدارة
    └── (ضع rasheh-logo.png و favicon.png هنا)
```

## قاعدة البيانات
شغّل بالترتيب في Supabase SQL Editor:
1. `supabase_additions.sql` (جدول testimonials)
2. `supabase_plans.sql` (جدول plans مع الباقات الافتراضية 100/200/300 ريال، وجدول payments، وأعمدة حالة الباقة في clients)

## حساب الإدارة
Supabase Dashboard → Authentication → Add User: `admin@rasheh.com` (Auto Confirm مفعّل). لا تُنشئ صفاً في `clients` لهذا الحساب.

## متغيرات البيئة في Vercel

| المتغير | مطلوب دائماً | الوصف |
|---|---|---|
| `SUPABASE_URL` | ✅ | رابط مشروع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | مفتاح service_role |
| `SUPABASE_ANON_KEY` | ✅ | مفتاح anon/public |
| `STRIPE_SECRET_KEY` | لتفعيل الدفع بالبطاقة | من dashboard.stripe.com → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | لتفعيل التحديث التلقائي للباقة | من Stripe → Webhooks → Add endpoint → `/api/payments?resource=webhook-stripe` |
| `PAYPAL_CLIENT_ID` | لتفعيل الدفع عبر PayPal | من developer.paypal.com |
| `PAYPAL_CLIENT_SECRET` | لتفعيل الدفع عبر PayPal | من developer.paypal.com |
| `PAYPAL_ENV` | اختياري | `live` للإنتاج، أو تُترك فارغة لبيئة sandbox |

**بدون مفاتيح Stripe/PayPal**: التحويل البنكي يعمل فوراً (يدوي بموافقة الإدارة). أزرار Stripe/PayPal تُظهر رسالة واضحة "الخدمة غير مُفعّلة حالياً" حتى تضيف المفاتيح.

## إعداد Webhook في Stripe
1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. الرابط: `https://yourdomain.com/api/payments?resource=webhook-stripe`
3. الحدث المطلوب: `checkout.session.completed`
4. انسخ Signing secret وضعه في `STRIPE_WEBHOOK_SECRET`.

## تدفق الدفع
- **Stripe / PayPal**: الشركة تُحوَّل لصفحة دفع مستضافة، وعند نجاح الدفع تتحدث `clients.plan` تلقائياً فوراً (30 يوم صلاحية).
- **تحويل بنكي**: الشركة ترفع رابط إثبات الدفع، تبقى باقتها `pending`، والإدارة توافق/ترفض من تبويب "الباقات والدفعات" في لوحة الإدارة — عند القبول تُفعَّل الباقة تلقائياً.

## النشر على Vercel
- لا `vercel.json`. Root Directory فارغ. Node.js `22.x`.
- تحقق أن `api/` يحوي فقط 5 وظائف فعلية: `me.js`, `auth.js`, `public.js`, `admin.js`, `payments.js` (+ `_shared.js` غير محسوب) = ضمن حد الـ 12 لخطة Hobby.
- تحقق أن `public/` يحوي: `index.html`, `admin.html`, `candidates.html`, `pricing.html`, `billing.html`.
