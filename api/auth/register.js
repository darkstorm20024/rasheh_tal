const { db, anon, reply, errorReply, readBody, ADMIN_EMAIL } = require('../_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405, { detail: 'Method not allowed' });
  try {
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
  } catch (error) {
    return errorReply(res, error);
  }
};
