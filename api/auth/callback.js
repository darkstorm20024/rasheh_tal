const { anon, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  const { code, next } = req.query;
  if (!code) return reply(res, 400, { detail: 'Missing code' });
  try {
    const { data, error } = await anon().auth.exchangeCodeForSession(code);
    if (error) throw error;
    const redirect = next || '/admin.html';
    res.setHeader('Set-Cookie', `rasheh_token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    res.writeHead(302, { Location: redirect });
    res.end();
  } catch (error) {
    return errorReply(res, error);
  }
};
