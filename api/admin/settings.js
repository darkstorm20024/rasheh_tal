const { db, reply, errorReply, user, adminOK, defaults, readBody } = require('../_shared');

module.exports = async (req, res) => {
  try {
    const currentUser = await user(req);
    if (!adminOK(currentUser)) return reply(res, 403, { detail: 'ليس لديك صلاحية.' });

    if (req.method === 'GET') {
      const { data, error } = await db().from('cms_content').select('*').eq('id', 1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return reply(res, 200, { ok: true, content: data || defaults });
    }

    if (req.method === 'PUT') {
      const body = readBody(req);
      const updates = {
        id: 1,
        hero_title: body.hero_title,
        hero_text: body.hero_text,
        video_url: body.video_url || '',
        video_title: body.video_title || '',
        video_text: body.video_text || '',
        socials: body.socials || {},
        bank: body.bank || {},
        news: body.news || []
      };
      const { data, error } = await db()
        .from('cms_content')
        .upsert(updates, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return reply(res, 200, { ok: true, content: data });
    }

    return reply(res, 405, { detail: 'Method not allowed' });
  } catch (error) {
    return errorReply(res, error);
  }
};
