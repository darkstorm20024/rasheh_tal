const {
  db,
  reply,
  errorReply,
  defaults,
  requireClient,
  readBody
} = require('./_shared');

/*
  قاموس عربي/إنجليزي للمطابقة الذكية.

  أمثلة:
  محاسب ↔ accountant / accounting / finance
  مطور ↔ developer / programmer
  مبيعات ↔ sales / business development
*/
const TRANSLATION_MAP = {
  محاسب: [
    'محاسب',
    'محاسبة',
    'accountant',
    'accounting',
    'financial accountant',
    'accounting specialist',
    'finance',
    'مالية'
  ],

  accountant: [
    'محاسب',
    'محاسبة',
    'accountant',
    'accounting',
    'financial accountant',
    'accounting specialist',
    'finance',
    'مالية'
  ],

  مطور: [
    'مطور',
    'مبرمج',
    'برمجة',
    'developer',
    'software developer',
    'web developer',
    'programmer',
    'full stack'
  ],

  developer: [
    'مطور',
    'مبرمج',
    'برمجة',
    'developer',
    'software developer',
    'web developer',
    'programmer',
    'full stack'
  ],

  frontend: [
    'frontend',
    'front end',
    'مطور واجهات',
    'react',
    'vue',
    'angular',
    'javascript',
    'typescript',
    'html',
    'css'
  ],

  'مطور واجهات': [
    'frontend',
    'front end',
    'مطور واجهات',
    'react',
    'vue',
    'angular',
    'javascript',
    'typescript',
    'html',
    'css'
  ],

  backend: [
    'backend',
    'back end',
    'مطور خلفي',
    'node',
    'nodejs',
    'python',
    'php',
    'java',
    'django',
    'laravel'
  ],

  'مطور خلفي': [
    'backend',
    'back end',
    'مطور خلفي',
    'node',
    'nodejs',
    'python',
    'php',
    'java',
    'django',
    'laravel'
  ],

  مصمم: [
    'مصمم',
    'تصميم',
    'designer',
    'design',
    'graphic designer',
    'ui',
    'ux',
    'figma',
    'photoshop'
  ],

  designer: [
    'مصمم',
    'تصميم',
    'designer',
    'design',
    'graphic designer',
    'ui',
    'ux',
    'figma',
    'photoshop'
  ],

  'موارد بشرية': [
    'موارد بشرية',
    'hr',
    'human resources',
    'recruiter',
    'recruitment',
    'talent acquisition'
  ],

  hr: [
    'موارد بشرية',
    'hr',
    'human resources',
    'recruiter',
    'recruitment',
    'talent acquisition'
  ],

  مبيعات: [
    'مبيعات',
    'sales',
    'sales representative',
    'sales executive',
    'business development'
  ],

  sales: [
    'مبيعات',
    'sales',
    'sales representative',
    'sales executive',
    'business development'
  ],

  تسويق: [
    'تسويق',
    'marketing',
    'digital marketing',
    'social media',
    'seo',
    'content creator'
  ],

  marketing: [
    'تسويق',
    'marketing',
    'digital marketing',
    'social media',
    'seo',
    'content creator'
  ],

  إداري: [
    'إداري',
    'إدارة',
    'administration',
    'administrative',
    'office manager',
    'business administration'
  ],

  administration: [
    'إداري',
    'إدارة',
    'administration',
    'administrative',
    'office manager',
    'business administration'
  ],

  مدير: [
    'مدير',
    'إدارة',
    'manager',
    'management',
    'project manager',
    'operations manager'
  ],

  manager: [
    'مدير',
    'إدارة',
    'manager',
    'management',
    'project manager',
    'operations manager'
  ],

  مهندس: [
    'مهندس',
    'هندسة',
    'engineer',
    'engineering',
    'civil engineer',
    'mechanical engineer',
    'electrical engineer'
  ],

  engineer: [
    'مهندس',
    'هندسة',
    'engineer',
    'engineering',
    'civil engineer',
    'mechanical engineer',
    'electrical engineer'
  ],

  ممرض: [
    'ممرض',
    'تمريض',
    'nurse',
    'nursing',
    'medical',
    'healthcare'
  ],

  nurse: [
    'ممرض',
    'تمريض',
    'nurse',
    'nursing',
    'medical',
    'healthcare'
  ],

  'خدمة عملاء': [
    'خدمة عملاء',
    'customer service',
    'customer support',
    'call center',
    'دعم العملاء'
  ],

  'customer service': [
    'خدمة عملاء',
    'customer service',
    'customer support',
    'call center',
    'دعم العملاء'
  ]
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/*
  skills في جدولك نوعها ARRAY.
  لذلك نتعامل معها كمصفوفة مباشرة.
*/
function skillArray(value) {
  if (Array.isArray(value)) {
    return unique(
      value
        .map(normalizeText)
        .filter(Boolean)
    );
  }

  return unique(
    String(value || '')
      .split(/[،,|;/]+/)
      .map(normalizeText)
      .filter(Boolean)
  );
}

function getTranslatedKeywords(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const keywords = new Set();

  keywords.add(normalizedQuery);

  normalizedQuery
    .split(/[\s،,/|]+/)
    .filter(word => word.length > 1)
    .forEach(word => keywords.add(word));

  Object.entries(TRANSLATION_MAP).forEach(([key, synonyms]) => {
    const normalizedKey = normalizeText(key);

    if (
      normalizedQuery.includes(normalizedKey) ||
      normalizedKey.includes(normalizedQuery)
    ) {
      synonyms.forEach(synonym => {
        keywords.add(normalizeText(synonym));
      });
    }
  });

  return unique([...keywords]);
}

function textContains(text, term) {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);

  if (!normalizedText || !normalizedTerm) {
    return false;
  }

  if (normalizedText.includes(normalizedTerm)) {
    return true;
  }

  const words = normalizedTerm
    .split(' ')
    .filter(word => word.length > 2);

  if (words.length > 1) {
    return words.every(word => normalizedText.includes(word));
  }

  return false;
}

function calculateMatch(candidate, criteria) {
  const requestedTitle = normalizeText(criteria.job_title);
  const requestedCity = normalizeText(criteria.city);
  const requestedSkills = skillArray(criteria.skills);
  const requiredExperience = Math.max(
    0,
    Number(criteria.min_experience || 0)
  );

  const candidateJobTitle = normalizeText(candidate.job_title);
  const candidateEducation = normalizeText(candidate.education);
  const candidateSkills = skillArray(candidate.skills);

  const candidateText = [
    candidateJobTitle,
    candidateEducation,
    candidateSkills.join(' ')
  ].join(' ');

  let jobScore = 0;
  let skillsScore = 0;
  let experienceScore = 0;
  let cityScore = 0;
  let jobMatched = false;

  /*
    50 نقطة للمسمى الوظيفي والترجمة.
  */
  if (!requestedTitle) {
    jobScore = 25;
    jobMatched = true;
  } else if (textContains(candidateJobTitle, requestedTitle)) {
    jobScore = 50;
    jobMatched = true;
  } else {
    const keywords = getTranslatedKeywords(requestedTitle);

    const matches = keywords.filter(keyword => {
      return textContains(candidateText, keyword);
    });

    if (matches.length >= 3) {
      jobScore = 46;
      jobMatched = true;
    } else if (matches.length === 2) {
      jobScore = 40;
      jobMatched = true;
    } else if (matches.length === 1) {
      jobScore = 30;
      jobMatched = true;
    }
  }

  /*
    لو كتب مسمى وظيفة ولم نكتشف أي توافق،
    لا نعرض المرشح.
  */
  if (requestedTitle && !jobMatched) {
    return {
      percentage: 0,
      matched: false,
      matchedSkills: [],
      breakdown: {
        job: 0,
        skills: 0,
        experience: 0,
        city: 0
      }
    };
  }

  /*
    25 نقطة للمهارات.
  */
  const matchedSkills = [];

  if (!requestedSkills.length) {
    skillsScore = 15;
  } else {
    requestedSkills.forEach(requestedSkill => {
      const found = candidateSkills.some(candidateSkill => {
        return (
          textContains(candidateSkill, requestedSkill) ||
          textContains(requestedSkill, candidateSkill)
        );
      });

      if (found) {
        matchedSkills.push(requestedSkill);
      }
    });

    skillsScore = Math.round(
      (matchedSkills.length / requestedSkills.length) * 25
    );
  }

  /*
    15 نقطة لسنوات الخبرة.
  */
  const candidateExperience = Math.max(
    0,
    Number(candidate.years_of_experience || 0)
  );

  if (!requiredExperience) {
    experienceScore = 15;
  } else if (candidateExperience >= requiredExperience) {
    experienceScore = 15;
  } else {
    experienceScore = Math.round(
      (candidateExperience / requiredExperience) * 15
    );
  }

  /*
    10 نقاط للمدينة.
  */
  if (!requestedCity) {
    cityScore = 10;
  } else if (textContains(candidate.city, requestedCity)) {
    cityScore = 10;
  }

  const percentage = Math.min(
    100,
    Math.round(
      jobScore +
      skillsScore +
      experienceScore +
      cityScore
    )
  );

  return {
    percentage,
    matched: percentage >= 40,
    matchedSkills,
    breakdown: {
      job: jobScore,
      skills: skillsScore,
      experience: experienceScore,
      city: cityScore
    }
  };
}

/* CMS */

async function handleContent(req, res) {
  const { data, error } = await db()
    .from('cms_content')
    .select('*')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return reply(res, 200, {
    ok: true,
    content: data || defaults
  });
}

/* Articles */

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
      if (error.code === 'PGRST116') {
        return reply(res, 404, {
          detail: 'المقال غير موجود'
        });
      }

      throw error;
    }

    return reply(res, 200, {
      ok: true,
      article: data
    });
  }

  const { data, error } = await db()
    .from('articles')
    .select(
      'id, slug, title, excerpt, cover_image, published_at, author_name, tags'
    )
    .eq('published', true)
    .order('published_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return reply(res, 200, {
    ok: true,
    articles: data || []
  });
}

/* Testimonials */

async function handleTestimonials(req, res) {
  const { data, error } = await db()
    .from('testimonials')
    .select(
      'id, author_name, author_role, company_name, content, rating, avatar_url'
    )
    .eq('published', true)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return reply(res, 200, {
    ok: true,
    testimonials: data || []
  });
}

/* Public stats */

async function handleStats(req, res) {
  const [
    { count: totalClients },
    { count: totalCandidates },
    { count: totalPlacements }
  ] = await Promise.all([
    db().from('clients').select('*', {
      count: 'exact',
      head: true
    }),

    db().from('candidates').select('*', {
      count: 'exact',
      head: true
    }),

    db().from('placements').select('*', {
      count: 'exact',
      head: true
    })
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

/*
  Smart candidate search.

  مثال للرابط:
  /api/public?resource=candidates&q=محاسب&city=الرياض&skill=Excel,ERP&min_experience=3
*/
async function handleCandidatesSearch(req, res) {
  const { client } = await requireClient(req);

  const criteria = {
    job_title: String(req.query.q || '').trim(),
    city: String(req.query.city || '').trim(),
    skills: String(req.query.skill || '').trim(),
    min_experience: Math.max(
      0,
      Number(req.query.min_experience || 0)
    )
  };

  /*
    هذه أسماء الأعمدة مطابقة تماماً للصور التي أرسلتها:
    full_name
    first_name
    job_title
    years_of_experience
    expected_salary
    resume_url
    skills (ARRAY)
  */
  const { data: candidates, error } = await db()
    .from('candidates')
    .select(`
      id,
      full_name,
      first_name,
      email,
      phone,
      job_title,
      city,
      work_type,
      gender,
      years_of_experience,
      education,
      expected_salary,
      skills,
      resume_url,
      raw_resume_text,
      status,
      created_at,
      updated_at
    `)
    .eq('status', 'active')
    .order('years_of_experience', {
      ascending: false
    })
    .limit(250);

  if (error) {
    throw error;
  }

  const results = (candidates || [])
    .map(candidate => {
      const match = calculateMatch(candidate, criteria);

      return {
        candidate_id: candidate.id,
        full_name: candidate.full_name,
        first_name: candidate.first_name,
        job_title: candidate.job_title,
        city: candidate.city,
        work_type: candidate.work_type,
        gender: candidate.gender,
        years_of_experience: candidate.years_of_experience || 0,
        education: candidate.education || '',
        expected_salary: candidate.expected_salary || null,
        skills: skillArray(candidate.skills),
        match_percentage: match.percentage,
        matched_skills: match.matchedSkills,
        match_breakdown: match.breakdown,
        has_resume: Boolean(candidate.resume_url)
      };
    })
    .filter(candidate => candidate.match_percentage >= 40)
    .sort((a, b) => {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }

      return (
        Number(b.years_of_experience || 0) -
        Number(a.years_of_experience || 0)
      );
    });

  return reply(res, 200, {
    ok: true,
    total: results.length,

    query: criteria,

    client_credits: Number(
      client.credits_balance || 0
    ),

    candidates: results
  });
}

/* Request candidate CV */

async function handleCandidateRequest(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);

  if (!body.candidate_id) {
    return reply(res, 400, {
      detail: 'معرّف المرشح مطلوب'
    });
  }

  const { data: candidate, error: candidateError } = await db()
    .from('candidates')
    .select('*')
    .eq('id', body.candidate_id)
    .eq('status', 'active')
    .single();

  if (candidateError || !candidate) {
    return reply(res, 404, {
      detail: 'المرشح غير موجود أو غير متاح حالياً'
    });
  }

  const { data: existing } = await db()
    .from('cv_requests')
    .select('id, status')
    .eq('client_id', client.id)
    .eq('candidate_id', candidate.id)
    .maybeSingle();

  if (existing) {
    return reply(res, 200, {
      ok: true,
      detail: 'لديك طلب سابق لهذا المرشح',
      request: existing
    });
  }

  /*
    هذا الجزء يستخدم schema cv_requests السابق:
    full_name / experience_years / cv_url.
  */
  const { data: requestRow, error: requestError } = await db()
    .from('cv_requests')
    .insert({
      client_id: client.id,
      candidate_id: candidate.id,
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.city,
      experience_years: candidate.years_of_experience || 0,
      skills: candidate.skills || [],
      cv_url: candidate.resume_url,
      status: 'pending'
    })
    .select()
    .single();

  if (requestError) {
    throw requestError;
  }

  return reply(res, 200, {
    ok: true,
    detail: 'تم إرسال طلب السيرة الذاتية بنجاح.',
    request: requestRow
  });
}

/* Company own requests */

async function handleMyRequests(req, res) {
  const { client } = await requireClient(req);

  const { data, error } = await db()
    .from('cv_requests')
    .select(`
      id,
      full_name,
      city,
      experience_years,
      status,
      created_at,
      candidate_id
    `)
    .eq('client_id', client.id)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return reply(res, 200, {
    ok: true,
    requests: data || []
  });
}

/* Router */

module.exports = async (req, res) => {
  try {
    const resource = req.query.resource;

    if (resource === 'content') {
      return await handleContent(req, res);
    }

    if (resource === 'articles') {
      return await handleArticles(req, res);
    }

    if (resource === 'testimonials') {
      return await handleTestimonials(req, res);
    }

    if (resource === 'stats') {
      return await handleStats(req, res);
    }

    if (resource === 'candidates') {
      return await handleCandidatesSearch(req, res);
    }

    if (
      resource === 'request-candidate' &&
      req.method === 'POST'
    ) {
      return await handleCandidateRequest(req, res);
    }

    if (resource === 'my-requests') {
      return await handleMyRequests(req, res);
    }

    return reply(res, 400, {
      detail: 'مورد غير معروف'
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
