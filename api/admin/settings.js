const { db, reply, errorReply, user, profile, adminOK, defaults } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const currentProfile = await profile(req);
    if (!adminOK(currentProfile)) return reply(res, 403, { detail: 'ليس لديك صلاحية.' });

    if (req.method === 'GET') {
      const { data, error } = await db().from('cms_content').select('*').single();
      if (error && error.code !== 'PGRST116') throw error;
      return reply(res, 200, { ok: true, content: data || defaults });
    }

    if (req.method === 'PUT') {
      const updates = req.body || {};
      const { data, error } = await db().from('cms_content').upsert(updates, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return reply(res, 200, { ok: true, content: data });
    }

    return reply(res, 405, { detail: 'Method not allowed' });
  } catch (error) {
    return errorReply(res, error);
  }
};
