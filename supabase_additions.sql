-- Testimonials (آراء العملاء) — إضافة جديدة، لا تؤثر على الجداول الحالية
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_name TEXT NOT NULL, author_role TEXT, company_name TEXT, content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5), avatar_url TEXT, published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(published, created_at);
DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published testimonials" ON testimonials FOR SELECT USING (published = true);
-- ملاحظة: حساب الإدارة admin@rasheh.com مكتوب في api/_shared.js — لا حاجة لجدول admins.
