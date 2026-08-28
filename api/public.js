const { db, reply, errorReply, defaults, requireClient, readBody } = require('./_shared');

/*
  ملف البحث والبيانات العامة.

  متوافق مع جدول candidates الفعلي:
  id, fullname, firstname, email, phone, jobtitle, city, worktype,
  gender, yearsofexperience, education, expectedsalary, skills,
  resumeurl, rawresumetext, status, createdat, updatedat
*/

const TRANSLATION_MAP = {
  "محاسب": [
    "محاسب",
    "محاسبة",
    "accountant",
    "accounting",
    "financial accountant",
    "accounting specialist",
    "finance",
    "مالية"
  ],
  "accountant": [
    "محاسب",
    "محاسبة",
    "accountant",
    "accounting",
    "financial accountant",
    "accounting specialist",
    "finance",
    "مالية"
  ],
  "مطور": [
    "مطور",
    "مبرمج",
    "برمجة",
    "developer",
    "software developer",
    "web developer",
    "programmer",
    "full stack"
  ],
  "developer": [
    "مطور",
    "مبرمج",
    "برمجة",
    "developer",
    "software developer",
    "web developer",
    "programmer",
    "full stack"
  ],
  "مطور واجهات": [
    "مطور واجهات",
    "frontend",
    "front end",
    "react",
    "vue",
    "angular",
    "javascript",
    "typescript",
    "html",
    "css"
  ],
  "frontend": [
    "مطور واجهات",
    "frontend",
    "front end",
    "react",
    "vue",
    "angular",
    "javascript",
    "typescript",
    "html",
    "css"
  ],
  "مطور خلفي": [
    "مطور خلفي",
    "backend",
    "back end",
    "node",
    "nodejs",
    "python",
    "php",
    "java",
    "django",
    "laravel"
  ],
  "backend": [
    "مطور خلفي",
    "backend",
    "back end",
    "node",
    "nodejs",
    "python",
    "php",
    "java",
    "django",
    "laravel"
  ],
  "مصمم": [
    "مصمم",
    "تصميم",
    "designer",
    "design",
    "graphic designer",
    "ui",
    "ux",
    "figma",
    "photoshop"
  ],
  "designer": [
    "مصمم",
    "تصميم",
    "designer",
    "design",
    "graphic designer",
    "ui",
    "ux",
    "figma",
    "photoshop"
  ],
  "موارد بشرية": [
    "موارد بشرية",
    "hr",
    "human resources",
    "recruiter",
    "recruitment",
    "talent acquisition"
  ],
  "hr": [
    "موارد بشرية",
    "hr",
    "human resources",
    "recruiter",
    "recruitment",
    "talent acquisition"
  ],
  "مبيعات": [
    "مبيعات",
    "sales",
    "sales representative",
    "sales executive",
    "business development"
  ],
  "sales": [
    "مبيعات",
    "sales",
    "sales representative",
    "sales executive",
    "business development"
  ],
  "تسويق": [
    "تسويق",
    "marketing",
    "digital marketing",
    "social media",
    "seo",
    "content creator"
  ],
  "marketing": [
    "تسويق",
    "marketing",
    "digital marketing",
    "social media",
    "seo",
    "content creator"
  ],
  "إداري": [
    "إداري",
    "إدارة",
    "administration",
    "administrative",
    "office manager",
    "business administration"
  ],
  "administration": [
    "إداري",
    "إدارة",
    "administration",
    "administrative",
    "office manager",
    "business administration"
  ],
  "مدير": [
    "مدير",
    "إدارة",
    "manager",
    "management",
    "project manager",
    "operations manager"
  ],
  "manager": [
    "مدير",
    "إدارة",
    "manager",
    "management",
    "project manager",
    "operations manager"
  ],
  "خدمة عملاء": [
    "خدمة عملاء",
    "customer service",
    "customer support",
    "call center",
    "دعم العملاء"
  ],
  "customer service": [
    "خدمة عملاء",
    "customer service",
    "customer support",
    "call center",
    "دعم العملاء"
  ],
  "مهندس": [
    "مهندس",
    "هندسة",
    "engineer",
    "engineering",
    "civil engineer",
    "mechanical engineer",
    "electrical engineer"
  ],
  "engineer": [
    "مهندس",
    "هندسة",
    "engineer",
    "engineering",
    "civil engineer",
    "mechanical engineer",
    "electrical engineer"
  ],
  "ممرض": [
    "ممرض",
    "تمريض",
    "nurse",
    "nursing",
    "medical",
    "healthcare"
  ],
  "nurse": [
    "ممرض",
    "تمريض",
    "nurse",
    "nursing",
    "medical",
    "healthcare"
  ]
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^\u0600-\u06FFa-z0-9+#.\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitTerms(value) {
  if (Array.isArray(value)) {
    return unique(value.map(normalizeText));
  }

  return unique(
    String(value || "")
      .split(/[،,|;/]+/)
      .map(normalizeText)
      .filter(Boolean)
  );
}

function getTranslatedKeywords(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

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
      synonyms.forEach(synonym => keywords.add(normalizeText(synonym)));
    }
  });

  return unique([...keywords]);
}

function textContains(text, term) {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);

  if (!normalizedText || !normalizedTerm) return false;
  if (normalizedText.includes(normalizedTerm)) return true;

  const termWords = normalizedTerm.split(" ").filter(word => word.length > 2);
  if (termWords.length > 1) {
    return termWords.every(word => normalizedText.includes(word));
  }

  return false;
}

function candidateSkills(candidate) {
  return splitTerms(candidate.skills);
}

function calculateMatch(candidate, criteria) {
  const requestedTitle = normalizeText(criteria.jobtitle);
  const requestedCity = normalizeText(criteria.city);
  const requestedSkills = splitTerms(criteria.skills);
  const minExperience = Math.max(0, Number(criteria.minexperience || 0));

  const jobTitle = normalizeText(candidate.jobtitle);
  const education = normalizeText(candidate.education);
  const candidateSkillItems = candidateSkills(candidate);
  const candidateSkillText = candidateSkillItems.join(" ");
  const candidateText = [jobTitle, education, candidateSkillText].join(" ");
  const translatedKeywords = getTranslatedKeywords(requestedTitle);

  let titleScore = 0;
  let skillsScore = 0;
  let experienceScore = 0;
  let cityScore = 0;
  let titleMatched = false;

  /* 50 نقطة لتوافق الوظيفة والمسميات والمرادفات */
  if (!requestedTitle) {
    titleScore = 25;
    titleMatched = true;
  } else if (textContains(jobTitle, requestedTitle)) {
    titleScore = 50;
    titleMatched = true;
  } else {
    const matches = translatedKeywords.filter(keyword =>
      textContains(candidateText, keyword)
    );

    if (matches.length >= 3) {
      titleScore = 46;
      titleMatched = true;
    } else if (matches.length === 2) {
      titleScore = 40;
      titleMatched = true;
    } else if (matches.length === 1) {
      titleScore = 30;
      titleMatched = true;
    }
  }

  /* إذا أدخل المستخدم مسمى وظيفة ولا يوجد أي توافق، لا نعرض المرشح */
  if (requestedTitle && !titleMatched) {
    return {
      percentage: 0,
      matched: false,
      matchedSkills: [],
      titleScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      cityScore: 0
    };
  }

  /* 25 نقطة لتوافق المهارات */
  const matchedSkills = [];
  if (requestedSkills.length === 0) {
    skillsScore = 15;
  } else {
    requestedSkills.forEach(requestedSkill => {
      const skillMatch = candidateSkillItems.some(candidateSkill => {
        return (
          textContains(candidateSkill, requestedSkill) ||
          textContains(requestedSkill, candidateSkill)
        );
      });

      if (skillMatch) matchedSkills.push(requestedSkill);
    });

    skillsScore = Math.round(
      (matchedSkills.length / requestedSkills.length) * 25
    );
  }

  /* 15 نقطة للخبرة */
  const candidateExperience = Math.max(
    0,
    Number(candidate.yearsofexperience || 0)
  );

  if (minExperience === 0) {
    experienceScore = 15;
  } else if (candidateExperience >= minExperience) {
    experienceScore = 15;
  } else {
    experienceScore = Math.round(
      (candidateExperience / minExperience) * 15
    );
  }

  /* 10 نقاط للمدينة */
  if (!requestedCity) {
    cityScore = 10;
  } else if (textContains(candidate.city, requestedCity)) {
    cityScore = 10;
  }

  const percentage = Math.min(
    100,
    Math.round(titleScore + skillsScore + experienceScore + cityScore)
  );

  return {
    percentage,
    matched: percentage >= 40,
    matchedSkills,
    titleScore,
    skillsScore,
    experienceScore,
    cityScore
  };
}

async function handleContent(req, res) {
  const { data, error } = await db()
    .from('cms_content')
    .select('*')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return reply(res, 200, {
    ok: true,
    content: data || defaults
  });
}

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
        return reply(res, 404, { detail: 'المقال غير موجود' });
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
    .order('published_at', { ascending: false });

  if (error) throw error;

  return reply(res, 200, {
    ok: true,
    articles: data || []
  });
}

async function handleTestimonials(req, res) {
  const { data, error } = await db()
    .from('testimonials')
    .select('id, author_name, author_role, company_name, content, rating, avatar_url')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return reply(res, 200, {
    ok: true,
    testimonials: data || []
  });
}

async function handleStats(req, res) {
  const [
    { count: totalClients },
    { count: totalCandidates },
    { count: totalPlacements }
  ] = await Promise.all([
    db().from('clients').select('*', { count: 'exact', head: true }),
    db().from('candidates').select('*', { count: 'exact', head: true }),
    db().from('placements').select('*', { count: 'exact', head: true })
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
  بحث ذكي باللغتين العربية والإنجليزية.
  أمثلة:
  - محاسب => accountant / accounting / finance
  - developer => مطور / مبرمج / software developer
  - مبيعات => sales / business development
*/
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
    أسماء الأعمدة أدناه مطابقة للـ candidates schema الفعلي:
    fullname, jobtitle, yearsofexperience, resumeurl
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
    .order('yearsofexperience', { ascending: false })
    .limit(250);

  if (error) throw error;

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
        skills: candidateSkills(candidate),
        match_percentage: match.percentage,
        matched_skills: match.matchedSkills,
        match_breakdown: {
          job_title: match.titleScore,
          skills: match.skillsScore,
          experience: match.experienceScore,
          city: match.cityScore
        },
        has_cv: Boolean(candidate.resumeurl)
      };
    })
    .filter(candidate => candidate.match_percentage >= 40)
    .sort((a, b) => {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }

      return Number(b.yearsofexperience || 0) - Number(a.yearsofexperience || 0);
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
    client_credits: Number(client.credits_balance || 0),
    candidates: results
  });
}

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

  /*
    هذا الجزء يفترض cv_requests schema القديم الذي أرسلته:
    full_name, experience_years, cv_url, skills.
    إذا كان جدول cv_requests عندك بأسماء snake_case مختلفة، أرسل أعمدته.
  */
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
      skills: candidateSkills(candidate),
      cv_url: candidate.resumeurl,
      status: 'pending'
    })
    .select()
    .single();

  if (requestError) throw requestError;

  return reply(res, 200, {
    ok: true,
    detail: 'تم إرسال طلب السيرة الذاتية بنجاح، وسيظهر في لوحة الإدارة.',
    request: requestRow
  });
}

async function handleMyRequests(req, res) {
  const { client } = await requireClient(req);

  const { data, error } = await db()
    .from('cv_requests')
    .select('id, full_name, city, experience_years, status, created_at, candidate_id')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return reply(res, 200, {
    ok: true,
    requests: data || []
  });
}

module.exports = async (req, res) => {
  try {
    const resource = req.query.resource;

    if (resource === 'content') return await handleContent(req, res);
    if (resource === 'articles') return await handleArticles(req, res);
    if (resource === 'testimonials') return await handleTestimonials(req, res);
    if (resource === 'stats') return await handleStats(req, res);
    if (resource === 'candidates') return await handleCandidatesSearch(req, res);
    if (resource === 'request-candidate' && req.method === 'POST') {
      return await handleCandidateRequest(req, res);
    }
    if (resource === 'my-requests') return await handleMyRequests(req, res);

    return reply(res, 400, {
      detail: 'مورد غير معروف'
    });
  } catch (error) {
    return errorReply(res, error);
  }
};
