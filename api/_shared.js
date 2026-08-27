const { createClient } = require('@supabase/supabase-js');

const defaults = {
  hero_title: 'وظّف أفضل الكفاءات في ثوانٍ مع منصة رَشّح الذكية',
  hero_text: 'محرك ذكي يربط أصحاب الشركات بالكفاءات الجاهزة، مع فرز دقيق وحماية كاملة لبيانات المرشحين.',
  video_url: '',
  video_title: 'كيف توفر منصة رَشّح وقت ومصاريف التوظيف؟',
  video_text: 'شاهد جولة سريعة في تجربة المطابقة الذكية.',
  socials: { whatsapp: '', linkedin: '', instagram: '', x: '', email: '' },
  bank: { name: '', account_name: '', iban: '' },
  news: [
    { title: 'دليل استقطاب أفضل الكفاءات', tag: 'دليل الشركات', text: 'خطوات عملية لبناء فريق قوي وتقليل وقت التوظيف.' },
    { title: 'محرك المطابقة الذكي', tag: 'تحديث المنصة', text: 'البحث بالخبرة والمهارات والمدينة في ثوانٍ.' }
  ]
};

class ApiError extends Error {
  constructor(status, detail) { super(detail); this.status = status; }
}

function env(name) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
  return process.env[name];
}

function db() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

function anon() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
}

function reply(res, status, body) {
  return res.status(status).json(body);
}

function errorReply(res, error) {
  const status = error instanceof ApiError ? error.status : 500;
  return reply(res, status, { detail: error?.message || 'حدث خطأ غير متوقع.' });
}

async function user(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) throw new ApiError(401, 'يرجى تسجيل الدخول.');
  const { data, error } = await anon().auth.getUser(token);
  if (error || !data?.user) throw new ApiError(401, 'يرجى تسجيل الدخول.');
  return data.user;
}

async function profile(req) {
  const currentUser = await user(req);
  const { data, error } = await db().from('clients').select('*').eq('auth_user_id', currentUser.id).single();
  if (error || !data) throw new ApiError(404, 'ملف الشركة غير موجود.');
  return data;
}

function adminOK(profileData) {
  return Boolean(process.env.ADMIN_EMAIL && profileData.email && profileData.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
}

module.exports = { db, reply, errorReply, user, profile, adminOK, defaults };
