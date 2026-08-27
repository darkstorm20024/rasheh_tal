const { db, reply, errorReply, user, profile, adminOK } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const currentProfile = await profile(req);

    if (!adminOK(currentProfile)) {
      return reply(res, 403, { detail: 'ليس لديك صلاحية.' });
    }

    const { data, error } = await db()
      .from('cv_requests')
      .select(`
        id,
        full_name,
        email,
        phone,
        city,
        experience_years,
        skills,
        cv_url,
        status,
        created_at,
        client:clients ( company_name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return reply(res, 200, { ok: true, requests: data || [] });
  } catch (error) {
    return errorReply(res, error);
  }
};
