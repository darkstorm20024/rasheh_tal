const {
  db,
  reply,
  errorReply,
  defaults,
  requireClient,
  readBody
} = require('./_shared');

/*
  قاموس ترجمة ومرادفات عربية/إنجليزية.

  مثال:
  محاسب -> accountant / accounting / finance
  developer -> مطور / مبرمج / full stack
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

function splitSkills(value) {
  if (Array.isArray(value)) {
    return unique(value.map(normalizeText));
  }

  return unique(
    String(value || '')
      .split(/[،,|;/]+/)
      .map(normalizeText)
      .filter(Boolean)
  );
}

function getSearchKeywords(query) {
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

  Object.entries(TRANSLATION_MAP).forEach(([key, terms]) => {
    const normalizedKey = normalizeText(key);

    if (
      normalizedQuery.includes(normalizedKey) ||
      normalizedKey.includes(normalizedQuery)
    ) {
      terms.forEach(term => {
        keywords.add(normalizeText(term));
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
  const requestedTitle = normalizeText(criteria.jobtitle);
  const requestedCity = normalizeText(criteria.city);
  const requestedSkills = splitSkills(criteria.skills);
  const requiredExperience = Math.max(
    0,
    Number(criteria.minexperience || 0)
  );

  const candidateJobTitle = normalizeText(candidate.jobtitle);
  const candidateEducation = normalizeText(candidate.education);
  const candidateSkills = splitSkills(candidate.skills);

  const candidateText = [
    candidateJobTitle,
    candidateEducation,
    candidateSkills.join(' ')
  ].join(' ');

  let jobScore = 0;
  let skillsScore = 0;
  let experienceScore = 0;
  let cityScore = 0;
  let titleMatched = false;

  /*
    50 نقطة للمسمى الوظيفي.
  */
  if (!requestedTitle) {
    jobScore = 25;
    titleMatched = true;
  } else if (textContains(candidateJobTitle, requestedTitle)) {
    jobScore = 50;
    titleMatched = true;
  } else {
    const keywords = getSearchKeywords(requestedTitle);

    const matchedKeywords = keywords.filter(keyword => {
      return textContains(candidateText, keyword);
    });

    if (matchedKeywords.length >= 3) {
      jobScore = 46;
      titleMatched = true;
    } else if (matchedKeywords.length === 2) {
      jobScore = 40;
      titleMatched = true;
    } else if (matchedKeywords.length === 1) {
      jobScore = 30;
      titleMatched = true;
    }
  }

  /*
    لو المستخدم كتب وظيفة ولا يوجد تطابق وظيفي نهائياً:
    لا نعرض المرشح.
  */
  if (requestedTitle && !titleMatched) {
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
      const exists = candidateSkills.some(candidateSkill => {
        return (
          textContains(candidateSkill, requestedSkill) ||
          textContains(requestedSkill, candidateSkill)
        );
      });

      if (exists) {
        matchedSkills.push(requestedSkill);
      }
    });

    skillsScore = Math.round(
      (matchedSkills.length / requestedSkills.length) * 25
    );
  }

  /*
    15 نقطة للخبرة.
  */
  const candidateExperience = Math.max(
    0,
    Number(candidate.yearsofexperience || 0)
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
    Math.round(jobScore + skillsScore + experienceScore + cityScore)
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

/* محتوى الصفحة الرئيسية */

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

/* المقالات */

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
    .select('id, slug, title, excerpt, cover_image, published_at, author_name, tags')
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

/* آراء العملاء */

async function handleTestimonials(req, res) {
  const { data, error } = await db()
    .from('testimonials')
    .select('id, author_name, author_role, company_name, content, rating, avatar_url')
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

/* الإحصائيات */

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

/* البحث الذكي عن المرشحين */

async function handleCandidatesSearch(req, res) {
  const { client } = await requireClient(req);

  const jobtitle = String(req.query.q || '').trim();
  const city = String(req.query.city || '').trim();
  const skills = String(req.query.skill || '').trim();
  const minexperience = Math.max(
    0,
    Number(req.query.min_experience || 0)
  );

  /*
    أسماء أعمدة candidates الحقيقية:
    fullname / jobtitle / yearsofexperience / resumeurl
  */
  const { data: candidates, error } = await db()
    .from('candidates')
    .select(`
      id,
      fullname,
      firstname,
      email,
      phone,
      jobtitle,
      city,
      worktype,
      gender,
      yearsofexperience,
      education,
      expectedsalary,
      skills,
      resumeurl,
      status
    `)
    .eq('status', 'active')
    .order('yearsofexperience', {
      ascending: false
    })
    .limit(250);

  if (error) {
    throw error;
  }

  const criteria = {
    jobtitle,
    city,
    skills,
    minexperience
  };

  const results = (candidates || [])
    .map(candidate => {
      const match = calculateMatch(candidate, criteria);

      return {
        candidate_id: candidate.id,
        fullname: candidate.fullname,
        firstname: candidate.firstname,
        jobtitle: candidate.jobtitle,
        city: candidate.city,
        worktype: candidate.worktype,
        gender: candidate.gender,
        yearsofexperience: candidate.yearsofexperience || 0,
        education: candidate.education || '',
        expected_salary: candidate.expectedsalary || null,
        skills: splitSkills(candidate.skills),
        match_percentage: match.percentage,
        matched_skills: match.matchedSkills,
        match_breakdown: match.breakdown,
        has_cv: Boolean(candidate.resumeurl)
      };
    })
    .filter(candidate => candidate.match_percentage >= 40)
    .sort((a, b) => {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }

      return (
        Number(b.yearsofexperience || 0) -
        Number(a.yearsofexperience || 0)
      );
    });

  return reply(res, 200, {
    ok: true,
    total: results.length,
    query: {
      jobtitle,
      city,
      skills,
      minexperience
    },

    /*
      الاسم هنا مطابق للعمود الذي أرسلته:
      credeits_balance
    */
    client_credits: Number(client.credeits_balance || 0),

    candidates: results
  });
}

/* طلب سيرة ذاتية */

async function handleCandidateRequest(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);

  const candidateId = body.candidate_id;

  if (!candidateId) {
    return reply(res, 400, {
      detail: 'معرّف المرشح مطلوب'
    });
  }

  const { data: candidate, error: candidateError } = await db()
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
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
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (existing) {
    return reply(res, 200, {
      ok: true,
      detail: 'لديك طلب سابق لهذا المرشح',
      request: existing
    });
  }

  const { data: requestRow, error: requestError } = await db()
    .from('cv_requests')
    .insert({
      client_id: client.id,
      candidate_id: candidate.id,
      full_name: candidate.fullname,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.city,
      experience_years: candidate.yearsofexperience || 0,
      skills: splitSkills(candidate.skills),
      cv_url: candidate.resumeurl,
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

/* طلبات الشركة السابقة */

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
