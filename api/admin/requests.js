const { db, reply, errorReply, user, adminOK, readBody } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    if (!adminOK(currentUser)) return reply(res, 403, { detail: 'ليس لديك صلاحية.' });

    if (req.method === 'GET') {
      const { data, error } = await db()
        .from('cv_requests')
        .select(`id, full_name, email, phone, city, experience_years, skills, cv_url, status, created_at, client:clients ( company_name )`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return reply(res, 200, { ok: true, requests: data || [] });
    }

    if (req.method === 'PUT') {
      const body = readBody(req);
      if (!body.id || !body.status) return reply(res, 400, { detail: 'المعرّف والحالة مطلوبان' });
      const { data, error } = await db()
        .from('cv_requests')
        .update({ status: body.status, notes: body.notes || null })
        .eq('id', body.id)
        .select()
        .single();
      if (error) throw error;
      return reply(res, 200, { ok: true, request: data });
    }

    return reply(res, 405, { detail: 'Method not allowed' });
  } catch (error) {
    return errorReply(res, error);
  }
};
