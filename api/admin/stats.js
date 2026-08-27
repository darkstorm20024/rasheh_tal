const { db, reply, profile, adminOK } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentProfile = await profile(req);

    if (!adminOK(currentProfile)) {
      return reply(res, 403, {
        detail: 'لوحة الإدارة متاحة لحساب المدير فقط.'
      });
    }

    const supabase = db();

    const [candidatesResult, clientsResult, requestsResult] =
      await Promise.all([
        supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('contact_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unlocked')
      ]);

    if (candidatesResult.error) {
      throw candidatesResult.error;
    }

    if (clientsResult.error) {
      throw clientsResult.error;
    }

    if (requestsResult.error) {
      throw requestsResult.error;
    }

    return reply(res, 200, {
      total_candidates: candidatesResult.count || 0,
      total_companies: clientsResult.count || 0,
      total_unlocked: requestsResult.count || 0
    });

  } catch (error) {
    return reply(res, 400, {
      detail: error.message || 'تعذر تحميل إحصاءات لوحة الإدارة.'
    });
  }
};
