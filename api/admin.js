const { db, reply, errorReply, requireAdmin, readBody, defaults, slugify } = require('./_shared');

async function handleStats(req, res) {
  const [
    { count: totalClients },
    { count: totalCandidates },
    { count: totalRequests },
    { count: pendingRequests },
    { count: approvedRequests },
    { count: totalPlacements },
    { count: totalArticles },
    { count: totalTestimonials }
  ] = await Promise.all([
    db().from('clients').select('*', { count: 'exact', head: true }),
    db().from('candidates').select('*', { count: 'exact', head: true }),
    db().from('cv_requests').select('*', { count: 'exact', head: true }),
    db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db().from('cv_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    db().from('placements').select('*', { count: 'exact', head: true }),
    db().from('articles').select('*', { count: 'exact', head: true }),
    db().from('testimonials').select('*', { count: 'exact', head: true })
  ]);

  return reply(res, 200, {
    ok: true,
    stats: {
      totalClients: totalClients || 0,
      totalCandidates: totalCandidates || 0,
      totalRequests: totalRequests || 0,
      pendingRequests: pendingRequests || 0,
      approvedRequests: approvedRequests || 0,
      totalPlacements: totalPlacements || 0,
      totalArticles: totalArticles || 0,
      totalTestimonials: totalTestimonials || 0
    }
  });
}

async function handleClients(req, res) {
  const { data, error } = await db()
    .from('clients')
    .select('id, company_name, email, contact_person, city, plan, plan_status, plan_expires_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return reply(res, 200, { ok: true, clients: data || [] });
}

async function handleRequests(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await db()
      .from('cv_requests')
      .select(`id, full_name, email, phone, city, experience_years, skills, cv_url, status, created_at, client:clients ( company_name )`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return reply(res, 200, { ok: true, requests: data || [] });
  }

  if (req.method === 'PUT') {
    const body = readBody(req);
    if (!body.id || !body.status) return reply(res, 400, { detail: 'المعرّف والحالة مطلوبان' });
    const { data, error } = await db()
      .from('cv_requests')
      .update({ status: body.status, notes: body.notes || null })
      .eq('id', body.id)
      .select()
      .single();
    if (error) throw error;
    return reply(res, 200, { ok: true, request: data });
  }

  return reply(res, 405, { detail: 'Method not allowed' });
}

async function handleSettings(req, res) {
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
}

async function handleArticles(req, res) {
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
}

async function handleTestimonials(req, res) {
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
}

async function handlePlans(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await db().from('plans').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return reply(res, 200, { ok: true, plans: data || [] });
  }

  if (req.method === 'PUT') {
    const body = readBody(req);
    if (!body.id) return reply(res, 400, { detail: 'معرّف الباقة مطلوب' });
    const updates = { ...body };
    delete updates.id;
    const { data, error } = await db()
      .from('plans')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();
    if (error) throw error;
    return reply(res, 200, { ok: true, plan: data });
  }

  return reply(res, 405, { detail: 'Method not allowed' });
}

module.exports = async (req, res) => {
  try {
    await requireAdmin(req);

    const resource = req.query.resource;
    if (resource === 'stats') return await handleStats(req, res);
    if (resource === 'clients') return await handleClients(req, res);
    if (resource === 'requests') return await handleRequests(req, res);
    if (resource === 'settings') return await handleSettings(req, res);
    if (resource === 'articles') return await handleArticles(req, res);
    if (resource === 'testimonials') return await handleTestimonials(req, res);
    if (resource === 'plans') return await handlePlans(req, res);
    return reply(res, 400, { detail: 'مورد غير معروف' });
  } catch (error) {
    return errorReply(res, error);
  }
};
