const { db, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const slug = req.query.slug;
    if (!slug) return reply(res, 400, { detail: 'Missing slug' });

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
  } catch (error) {
    return errorReply(res, error);
  }
};
