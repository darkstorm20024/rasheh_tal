const { anon, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (token) await anon().auth.signOut();
    return reply(res, 200, { ok: true });
  } catch (error) {
    return errorReply(res, error);
  }
};
