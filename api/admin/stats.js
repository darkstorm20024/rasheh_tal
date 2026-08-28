const { db, reply, errorReply, user, adminOK } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    if (!adminOK(currentUser)) return reply(res, 403, { detail: 'ليس لديك صلاحية للوصول إلى لوحة الإدارة.' });

    const [
      { count: totalClients },
      { count: totalCandidates },
      { count: totalRequests },
      { count: pendingRequests },
      { count: approvedRequests },
      { count: totalPlacements },
      { count: totalArticles },
      { count: totalTestimonials }
    ] = await Promise.all([
      db().from('clients').select('*', { count: 'exact', head: true }),
      db().from('candidates').select('*', { count: 'exact', head: true }),
      db().from('cv_requests').select('*', { count: 'exact', head: true }),
      db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      db().from('placements').select('*', { count: 'exact', head: true }),
      db().from('articles').select('*', { count: 'exact', head: true }),
      db().from('testimonials').select('*', { count: 'exact', head: true })
    ]);

    return reply(res, 200, {
      ok: true,
      stats: {
        totalClients: totalClients || 0,
        totalCandidates: totalCandidates || 0,
        totalRequests: totalRequests || 0,
        pendingRequests: pendingRequests || 0,
        approvedRequests: approvedRequests || 0,
        totalPlacements: totalPlacements || 0,
        totalArticles: totalArticles || 0,
        totalTestimonials: totalTestimonials || 0
      }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
