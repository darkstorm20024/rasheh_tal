const { db, reply, errorReply, user, adminOK, readBody } = require('../_shared');

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/-+/g, '-');
}

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    if (!adminOK(currentUser)) return reply(res, 403, { detail: 'ليس لديك صلاحية.' });

    if (req.method === 'GET') {
      const { data, error } = await db()
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return reply(res, 200, { ok: true, articles: data || [] });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      if (!body.title || !body.content) return reply(res, 400, { detail: 'العنوان والمحتوى مطلوبان' });

      const slug = body.slug ? slugify(body.slug) : slugify(body.title) + '-' + Date.now().toString(36);
      const payload = {
        slug,
        title: body.title,
        excerpt: body.excerpt || '',
        content: body.content,
        cover_image: body.cover_image || '',
        author_name: body.author_name || 'فريق رَشّح',
        published: Boolean(body.published),
        published_at: body.published ? new Date().toISOString() : null,
        tags: body.tags || [],
        seo_title: body.seo_title || body.title,
        seo_description: body.seo_description || body.excerpt || ''
      };

      const { data, error } = await db().from('articles').insert(payload).select().single();
      if (error) throw error;
      return reply(res, 200, { ok: true, article: data });
    }

    if (req.method === 'PUT') {
      const body = readBody(req);
      if (!body.id) return reply(res, 400, { detail: 'معرّف المقال مطلوب' });

      const updates = { ...body };
      delete updates.id;
      if (updates.published === true) updates.published_at = new Date().toISOString();
      if (updates.published === false) updates.published_at = null;

      const { data, error } = await db()
        .from('articles')
        .update(updates)
        .eq('id', body.id)
        .select()
        .single();
      if (error) throw error;
      return reply(res, 200, { ok: true, article: data });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || readBody(req).id;
      if (!id) return reply(res, 400, { detail: 'معرّف المقال مطلوب' });

      const { error } = await db().from('articles').delete().eq('id', id);
      if (error) throw error;
      return reply(res, 200, { ok: true });
    }

    return reply(res, 405, { detail: 'Method not allowed' });
  } catch (error) {
    return errorReply(res, error);
  }
};
