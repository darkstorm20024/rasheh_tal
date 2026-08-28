const { db, anon, reply, errorReply, readBody, ADMIN_EMAIL } = require('./_shared');

async function handleLogin(req, res) {
  const { email, password } = readBody(req);
  if (!email || !password) return reply(res, 400, { detail: 'البريد وكلمة المرور مطلوبان' });

  const { data, error } = await anon().auth.signInWithPassword({ email, password });
  if (error) throw new Error('البريد أو كلمة المرور غير صحيحة');

  return reply(res, 200, {
    ok: true,
    access_token: data.session.access_token,
    user: { id: data.user.id, email: data.user.email }
  });
}

async function handleRegister(req, res) {
  const body = readBody(req);
  const { company_name, contact_person, city, email, phone, password } = body;

  if (!company_name || !contact_person || !city || !email || !phone || !password) {
    return reply(res, 400, { detail: 'جميع الحقول مطلوبة' });
  }
  if (password.length < 8) {
    return reply(res, 400, { detail: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
  }
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return reply(res, 400, { detail: 'هذا البريد محجوز' });
  }

  const supa = db();
  const { data: authData, error: authError } = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'company' }
  });
  if (authError) throw new Error(authError.message || 'فشل إنشاء الحساب');

  const { error: profileError } = await supa.from('clients').insert({
    auth_user_id: authData.user.id,
    company_name,
    contact_person,
    city,
    email,
    phone,
    plan: 'basic'
  });

  if (profileError) {
    await supa.auth.admin.deleteUser(authData.user.id);
    throw new Error('فشل إنشاء ملف الشركة: ' + profileError.message);
  }

  return reply(res, 200, { ok: true, detail: 'تم إنشاء الحساب بنجاح' });
}

async function handleLogout(req, res) {
  return reply(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405, { detail: 'Method not allowed' });
  try {
    const action = req.query.action;
    if (action === 'login') return await handleLogin(req, res);
    if (action === 'register') return await handleRegister(req, res);
    if (action === 'logout') return await handleLogout(req, res);
    return reply(res, 400, { detail: 'إجراء غير معروف' });
  } catch (error) {
    return errorReply(res, error);
  }
};
