const { db, reply, errorReply, defaults, requireClient, readBody } = require('./_shared');

async function handleContent(req, res) {
  const { data, error } = await db().from('cms_content').select('*').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  return reply(res, 200, { ok: true, content: data || defaults });
}

async function handleArticles(req, res) {
  const slug = req.query.slug;
  if (slug) {
    const { data, error } = await db().from('articles').select('*').eq('slug', slug).eq('published', true).single();
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
  const [{ count: totalClients }, { count: totalCandidates }, { count: totalPlacements }] = await Promise.all([
    db().from('clients').select('*', { count: 'exact', head: true }),
    db().from('candidates').select('*', { count: 'exact', head: true }),
    db().from('placements').select('*', { count: 'exact', head: true })
  ]);
  return reply(res, 200, {
    ok: true,
    stats: { totalClients: totalClients || 0, totalCandidates: totalCandidates || 0, totalPlacements: totalPlacements || 0, avgTimeToHire: '5 أيام' }
  });
}

async function handleCandidatesSearch(req, res) {
  const { client } = await requireClient(req);
  let query = db()
    .from('candidates')
    .select('id, full_name, city, current_title, experience_years, skills, education, languages, portfolio_url, linkedin_url, cv_url, status')
    .eq('status', 'active');

  const q = (req.query.q || '').trim();
  const city = (req.query.city || '').trim();
  const minExp = parseInt(req.query.min_experience || '0') || 0;
  const skill = (req.query.skill || '').trim();

  if (city) query = query.ilike('city', `%${city}%`);
  if (minExp > 0) query = query.gte('experience_years', minExp);
  if (skill) query = query.contains('skills', [skill]);
  if (q) query = query.or(`full_name.ilike.%${q}%,current_title.ilike.%${q}%`);

  const { data, error } = await query.order('experience_years', { ascending: false }).limit(60);
  if (error) throw error;
  return reply(res, 200, { ok: true, candidates: data || [], client_plan: client.plan });
}

async function handleCandidateRequest(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);
  const candidateId = body.candidate_id;
  if (!candidateId) return reply(res, 400, { detail: 'معرّف المرشح مطلوب' });

  const { data: candidate, error: candErr } = await db().from('candidates').select('*').eq('id', candidateId).single();
  if (candErr || !candidate) return reply(res, 404, { detail: 'المرشح غير موجود' });

  const { data: existing } = await db()
    .from('cv_requests')
    .select('id, status')
    .eq('client_id', client.id)
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (existing) return reply(res, 200, { ok: true, detail: 'لديك طلب سابق لهذا المرشح', request: existing });

  const { data: reqRow, error: insErr } = await db().from('cv_requests').insert({
    client_id: client.id,
    candidate_id: candidate.id,
    full_name: candidate.full_name,
    email: candidate.email,
    phone: candidate.phone,
    city: candidate.city,
    experience_years: candidate.experience_years,
    skills: candidate.skills,
    cv_url: candidate.cv_url,
    status: 'pending'
  }).select().single();
  if (insErr) throw insErr;

  return reply(res, 200, { ok: true, detail: 'تم إرسال طلبك بنجاح، سيتم مراجعته قريباً', request: reqRow });
}

async function handleMyRequests(req, res) {
  const { client } = await requireClient(req);
  const { data, error } = await db()
    .from('cv_requests')
    .select('id, full_name, city, experience_years, status, created_at, candidate_id')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return reply(res, 200, { ok: true, requests: data || [] });
}

module.exports = async (req, res) => {
  try {
    const resource = req.query.resource;
    if (resource === 'content') return await handleContent(req, res);
    if (resource === 'articles') return await handleArticles(req, res);
    if (resource === 'testimonials') return await handleTestimonials(req, res);
    if (resource === 'stats') return await handleStats(req, res);
    if (resource === 'candidates') return await handleCandidatesSearch(req, res);
    if (resource === 'request-candidate' && req.method === 'POST') return await handleCandidateRequest(req, res);
    if (resource === 'my-requests') return await handleMyRequests(req, res);
    return reply(res, 400, { detail: 'مورد غير معروف' });
  } catch (error) {
    return errorReply(res, error);
  }
};
