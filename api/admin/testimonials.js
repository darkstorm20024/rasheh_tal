const { db, reply, errorReply, user, adminOK, readBody } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    if (!adminOK(currentUser)) return reply(res, 403, { detail: 'ليس لديك صلاحية.' });

    if (req.method === 'GET') {
      const { data, error } = await db()
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return reply(res, 200, { ok: true, testimonials: data || [] });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      if (!body.author_name || !body.content) return reply(res, 400, { detail: 'اسم الكاتب والمحتوى مطلوبان' });

      const payload = {
        author_name: body.author_name,
        author_role: body.author_role || '',
        company_name: body.company_name || '',
        content: body.content,
        rating: body.rating || 5,
        avatar_url: body.avatar_url || '',
        published: Boolean(body.published)
      };
      const { data, error } = await db().from('testimonials').insert(payload).select().single();
      if (error) throw error;
      return reply(res, 200, { ok: true, testimonial: data });
    }

    if (req.method === 'PUT') {
      const body = readBody(req);
      if (!body.id) return reply(res, 400, { detail: 'معرّف الرأي مطلوب' });
      const updates = { ...body };
      delete updates.id;
      const { data, error } = await db()
        .from('testimonials')
        .update(updates)
        .eq('id', body.id)
        .select()
        .single();
      if (error) throw error;
      return reply(res, 200, { ok: true, testimonial: data });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || readBody(req).id;
      if (!id) return reply(res, 400, { detail: 'معرّف الرأي مطلوب' });
      const { error } = await db().from('testimonials').delete().eq('id', id);
      if (error) throw error;
      return reply(res, 200, { ok: true });
    }

    return reply(res, 405, { detail: 'Method not allowed' });
  } catch (error) {
    return errorReply(res, error);
  }
};
