const { db, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const [
      { count: totalClients },
      { count: totalCandidates },
      { count: totalPlacements },
      { data: avgData }
    ] = await Promise.all([
      db().from('clients').select('*', { count: 'exact', head: true }),
      db().from('candidates').select('*', { count: 'exact', head: true }),
      db().from('placements').select('*', { count: 'exact', head: true }),
      db().from('placements').select('created_at').order('created_at', { ascending: true }).limit(1)
    ]);

    let avgTimeToHire = '—';
    if (avgData && avgData.length > 0) {
      const first = new Date(avgData[0].created_at);
      const diff = Math.floor((Date.now() - first) / (1000 * 60 * 60 * 24));
      avgTimeToHire = `${diff} يوم`;
    }

    return reply(res, 200, {
      ok: true,
      stats: { totalClients: totalClients || 0, totalCandidates: totalCandidates || 0, totalPlacements: totalPlacements || 0, avgTimeToHire }
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
