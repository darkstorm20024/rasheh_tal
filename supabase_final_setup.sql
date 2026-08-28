-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CMS Content (single row, id=1)
-- =============================================
CREATE TABLE IF NOT EXISTS cms_content (
  id INTEGER PRIMARY KEY DEFAULT 1,
  hero_title TEXT NOT NULL,
  hero_text TEXT NOT NULL,
  video_url TEXT,
  video_title TEXT,
  video_text TEXT,
  socials JSONB DEFAULT '{"whatsapp":"","linkedin":"","instagram":"","x":"","email":""}'::jsonb,
  bank JSONB DEFAULT '{"name":"","account_name":"","iban":""}'::jsonb,
  news JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults
INSERT INTO cms_content (id, hero_title, hero_text, video_title, video_text)
VALUES (1,
  'وظّف أفضل الكفاءات في ثوانٍ مع منصة رَشّح الذكية',
  'محرك ذكي يربط أصحاب الشركات بالكفاءات الجاهزة، مع فرز دقيق وحماية كاملة لبيانات المرشحين.',
  'كيف توفر منصة رَشّح وقت ومصاريف التوظيف؟',
  'شاهد جولة سريعة في تجربة المطابقة الذكية.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. Clients (Companies)
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  plan TEXT DEFAULT 'basic',
  logo_url TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_auth_user ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- =============================================
-- 3. Candidates
-- =============================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  nationality TEXT,
  birth_date DATE,
  gender TEXT,
  current_title TEXT,
  experience_years INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  languages JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  cv_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','hired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_city ON candidates(city);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN (skills);

-- =============================================
-- 4. CV Requests (Company requests candidate CVs)
-- =============================================
CREATE TABLE IF NOT EXISTS cv_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  experience_years INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  cv_url TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_requests_client ON cv_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_cv_requests_candidate ON cv_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_requests_status ON cv_requests(status);

-- =============================================
-- 5. Placements (Successful hires)
-- =============================================
CREATE TABLE IF NOT EXISTS placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  cv_request_id UUID REFERENCES cv_requests(id) ON DELETE SET NULL,
  position_title TEXT NOT NULL,
  salary_range TEXT,
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placements_client ON placements(client_id);
CREATE INDEX IF NOT EXISTS idx_placements_candidate ON placements(candidate_id);

-- =============================================
-- 6. Articles / Blog
-- =============================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_name TEXT,
  author_avatar TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published, published_at);

-- =============================================
-- 7. Updated At Trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS update_cms_content_updated_at ON cms_content;
CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON cms_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cv_requests_updated_at ON cv_requests;
CREATE TRIGGER update_cv_requests_updated_at BEFORE UPDATE ON cv_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. Row Level Security (RLS) Policies
-- =============================================
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- CMS: Public read, admin write
CREATE POLICY "Public read cms_content" ON cms_content FOR SELECT USING (true);
CREATE POLICY "Admin write cms_content" ON cms_content FOR ALL USING (
  auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
) WITH CHECK (
  auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
);

-- Clients: Own profile
CREATE POLICY "Client read own" ON clients FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Client update own" ON clients FOR UPDATE USING (auth_user_id = auth.uid());

-- Candidates: Own profile
CREATE POLICY "Candidate read own" ON candidates FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Candidate update own" ON candidates FOR UPDATE USING (auth_user_id = auth.uid());

-- CV Requests: Client owns theirs, candidate sees theirs
CREATE POLICY "Client read own requests" ON cv_requests FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Candidate read own requests" ON cv_requests FOR SELECT USING (
  candidate_id IN (SELECT id FROM candidates WHERE auth_user_id = auth.uid())
);

-- Placements: Client and candidate
CREATE POLICY "Client read placements" ON placements FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Candidate read placements" ON placements FOR SELECT USING (
  candidate_id IN (SELECT id FROM candidates WHERE auth_user_id = auth.uid())
);

-- Articles: Public read published
CREATE POLICY "Public read published articles" ON articles FOR SELECT USING (published = true);
CREATE POLICY "Admin write articles" ON articles FOR ALL USING (
  auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
) WITH CHECK (
  auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
);

-- =============================================
-- 9. Storage Buckets (run in Supabase Dashboard > Storage)
-- =============================================
-- Bucket: logos (public) — for company logos
-- Bucket: cvs (private) — for candidate CVs
-- Bucket: covers (public) — for article cover images
-- Bucket: avatars (public) — for user avatars
