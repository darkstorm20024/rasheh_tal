const { db, reply, errorReply, defaults } = require('./_shared');

async function handleContent(req, res) {
  const { data, error } = await db().from('cms_content').select('*').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  return reply(res, 200, { ok: true, content: data || defaults });
}

async function handleArticles(req, res) {
  const slug = req.query.slug;

  if (slug) {
    const { data, error } = await db()
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return reply(res, 404, { detail: 'المقال غير موجود' });
      throw error;
    }
    return reply(res, 200, { ok: true, article: data });
  }

  const { data, error } = await db()
    .from('articles')
    .select('id, slug, title, excerpt, cover_image, published_at, author_name, tags')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return reply(res, 200, { ok: true, articles: data || [] });
}

async function handleTestimonials(req, res) {
  const { data, error } = await db()
    .from('testimonials')
    .select('id, author_name, author_role, company_name, content, rating, avatar_url')
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return reply(res, 200, { ok: true, testimonials: data || [] });
}

async function handleStats(req, res) {
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
}

module.exports = async (req, res) => {
  try {
    const resource = req.query.resource;
    if (resource === 'content') return await handleContent(req, res);
    if (resource === 'articles') return await handleArticles(req, res);
    if (resource === 'testimonials') return await handleTestimonials(req, res);
    if (resource === 'stats') return await handleStats(req, res);
    return reply(res, 400, { detail: 'مورد غير معروف' });
  } catch (error) {
    return errorReply(res, error);
  }
};
