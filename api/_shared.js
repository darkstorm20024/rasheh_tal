const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAIL = 'admin@rasheh.com';

const defaults = {
  hero_title: 'وظّف أفضل الكفاءات في ثوانٍ مع منصة رَشّح الذكية',
  hero_text: 'محرك ذكي يربط أصحاب الشركات بالكفاءات الجاهزة، مع فرز دقيق وحماية كاملة لبيانات المرشحين.',
  video_url: '',
  video_title: 'كيف توفر منصة رَشّح وقت ومصاريف التوظيف؟',
  video_text: 'شاهد جولة سريعة في تجربة المطابقة الذكية.',
  socials: { whatsapp: '', linkedin: '', instagram: '', x: '', email: '' },
  bank: { name: '', account_name: '', iban: '' },
  news: []
};

class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

function env(name) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
  return process.env[name];
}

function db() {
  return createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}

function anon() {
  return createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_ANON_KEY'),
    { auth: { persistSession: false } }
  );
}

function reply(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

function errorReply(res, error) {
  console.error('API Error:', error);
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

  if (currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { id: null, email: currentUser.email, is_admin: true, company_name: 'رَشّح - الإدارة' };
  }

  const { data, error } = await db()
    .from('clients')
    .select('*')
    .eq('auth_user_id', currentUser.id)
    .single();

  if (error || !data) throw new ApiError(404, 'ملف الشركة غير موجود.');
  return { ...data, is_admin: false };
}

function adminOK(currentUser) {
  return Boolean(currentUser?.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

module.exports = { db, anon, reply, errorReply, user, profile, adminOK, defaults, ApiError, ADMIN_EMAIL, readBody };
