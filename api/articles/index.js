const { db, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const { data, error } = await db()
      .from('articles')
      .select('id, slug, title, excerpt, cover_image, published_at, author_name, tags')
      .eq('published', true)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return reply(res, 200, { ok: true, articles: data || [] });
  } catch (error) {
    return errorReply(res, error);
  }
};
