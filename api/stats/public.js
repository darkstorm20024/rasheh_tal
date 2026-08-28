const { db, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const [
      { count: totalClients },
      { count: totalCandidates },
      { count: totalPlacements }
    ] = await Promise.all([
      db().from('clients').select('*', { count: 'exact', head: true }),
      db().from('candidates').select('*', { count: 'exact', head: true }),
      db().from('placements').select('*', { count: 'exact', head: true })
    ]);

    return reply(res, 200, {
      ok: true,
      stats: {
        totalClients: totalClients || 0,
        totalCandidates: totalCandidates || 0,
        totalPlacements: totalPlacements || 0,
        avgTimeToHire: '5 أيام'
      }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
