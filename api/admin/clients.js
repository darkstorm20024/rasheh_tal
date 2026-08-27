const { db, reply, errorReply, user, profile, adminOK } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const currentProfile = await profile(req);

    if (!adminOK(currentProfile)) {
      return reply(res, 403, { detail: 'ليس لديك صلاحية.' });
    }

    const { data, error } = await db()
      .from('clients')
      .select('id, company_name, email, contact_person, city, plan, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return reply(res, 200, { ok: true, clients: data || [] });
  } catch (error) {
    return errorReply(res, error);
  }
};
