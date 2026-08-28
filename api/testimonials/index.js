const { db, reply, errorReply } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const { data, error } = await db()
      .from('testimonials')
      .select('id, author_name, author_role, company_name, content, rating, avatar_url')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return reply(res, 200, { ok: true, testimonials: data || [] });
  } catch (error) {
    return errorReply(res, error);
  }
};
