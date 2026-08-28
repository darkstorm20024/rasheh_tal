const { anon, reply, errorReply, readBody } = require('../_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return reply(res, 405, { detail: 'Method not allowed' });
  try {
    const { email, password } = readBody(req);
    if (!email || !password) return reply(res, 400, { detail: 'البريد وكلمة المرور مطلوبان' });

    const { data, error } = await anon().auth.signInWithPassword({ email, password });
    if (error) throw new Error('البريد أو كلمة المرور غير صحيحة');

    return reply(res, 200, {
      ok: true,
      access_token: data.session.access_token,
      user: { id: data.user.id, email: data.user.email }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
