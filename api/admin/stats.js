const { db, reply, errorReply, user, profile, adminOK } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    const currentProfile = await profile(req);
    if (!adminOK(currentProfile)) return reply(res, 403, { detail: 'ليس لديك صلاحية للوصول إلى لوحة الإدارة.' });

    const [
      { count: totalClients },
      { count: totalRequests },
      { count: pendingRequests },
      { count: approvedRequests }
    ] = await Promise.all([
      db().from('clients').select('*', { count: 'exact', head: true }),
      db().from('cv_requests').select('*', { count: 'exact', head: true }),
      db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved')
    ]);

    return reply(res, 200, {
      ok: true,
      stats: {
        totalClients: totalClients || 0,
        totalRequests: totalRequests || 0,
        pendingRequests: pendingRequests || 0,
        approvedRequests: approvedRequests || 0
      }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
