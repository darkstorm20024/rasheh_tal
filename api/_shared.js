const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAIL = 'admin@rasheh.com';

class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

function env(name) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}`);
  }

  return process.env[name];
}

function db() {
  return createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false
      }
    }
  );
}

function anon() {
  return createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false
      }
    }
  );
}

function reply(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  return res.status(status).json(body);
}

function errorReply(res, error) {
  console.error('API Error:', error);

  const status = error instanceof ApiError ? error.status : 500;

  return reply(res, status, {
    detail: error?.message || 'حدث خطأ غير متوقع.'
  });
}

async function user(req) {
  const token = (req.headers.authorization || '')
    .replace('Bearer ', '')
    .trim();

  if (!token) {
    throw new ApiError(401, 'يرجى تسجيل الدخول أولاً.');
  }

  const { data, error } = await anon().auth.getUser(token);

  if (error || !data?.user) {
    throw new ApiError(401, 'جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى.');
  }

  return data.user;
}

function adminOK(currentUser) {
  return Boolean(
    currentUser?.email &&
    currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

async function requireClient(req) {
  const currentUser = await user(req);

  if (adminOK(currentUser)) {
    throw new ApiError(
      403,
      'صفحة البحث عن المرشحين مخصصة لحسابات الشركات فقط.'
    );
  }

  /*
    هذه هي أعمدة clients الحقيقية عندك:
    id / company_name / contact_name / email / phone /
    credeits_balance / created_at / auth_user_id
  */
  const { data: client, error } = await db()
    .from('clients')
    .select(`
      id,
      company_name,
      contact_name,
      email,
      phone,
      credeits_balance,
      created_at,
      auth_user_id
    `)
    .eq('auth_user_id', currentUser.id)
    .single();

  if (error || !client) {
    throw new ApiError(
      403,
      'لم يتم العثور على ملف الشركة المرتبط بحسابك.'
    );
  }

  return {
    user: currentUser,
    client
  };
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  try {
    return JSON.parse(req.body || '{}');
  } catch (error) {
    return {};
  }
}

const defaults = {
  hero_title: 'وظّف أفضل الكفاءات في ثوانٍ مع منصة رَشّح الذكية',
  hero_text:
    'محرك ذكي يربط أصحاب الشركات بالكفاءات الجاهزة، مع فرز دقيق وحماية كاملة لبيانات المرشحين.',
  video_url: '',
  video_title: '',
  video_text: '',
  socials: {
    whatsapp: '',
    linkedin: '',
    instagram: '',
    x: '',
    email: ''
  },
  bank: {
    name: '',
    account_name: '',
    iban: ''
  },
  news: []
};

module.exports = {
  db,
  anon,
  reply,
  errorReply,
  user,
  adminOK,
  requireClient,
  readBody,
  defaults,
  ApiError,
  ADMIN_EMAIL
};
