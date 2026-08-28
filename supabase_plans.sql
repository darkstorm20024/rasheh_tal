-- Plans (الباقات) — قابلة للتعديل من لوحة الإدارة
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, price NUMERIC NOT NULL, currency TEXT DEFAULT 'SAR',
  cv_requests_limit INTEGER, features JSONB DEFAULT '[]'::jsonb, is_popular BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO plans (id, name, price, currency, cv_requests_limit, features, is_popular, sort_order) VALUES
  ('basic', 'أساسية', 100, 'SAR', 10, '["10 طلبات سيرة ذاتية شهرياً","دعم عبر البريد الإلكتروني","تصفح غير محدود للمرشحين"]'::jsonb, FALSE, 1),
  ('pro', 'محترفة', 200, 'SAR', 40, '["40 طلب سيرة ذاتية شهرياً","دعم مخصص عبر واتساب","أولوية في مراجعة الطلبات","تقارير أداء شهرية"]'::jsonb, TRUE, 2),
  ('enterprise', 'مؤسسات', 300, 'SAR', NULL, '["طلبات سير ذاتية غير محدودة","مدير حساب مخصص","أولوية قصوى في المراجعة","تقارير وتحليلات متقدمة"]'::jsonb, FALSE, 3)
ON CONFLICT (id) DO NOTHING;
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Admin write plans" ON plans FOR ALL USING (auth.jwt() ->> 'email' = current_setting('app.admin_email', true)) WITH CHECK (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

-- Payments (سجل عمليات الدفع)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id), amount NUMERIC NOT NULL, currency TEXT DEFAULT 'SAR',
  method TEXT NOT NULL CHECK (method IN ('stripe','paypal','bank_transfer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','rejected')),
  provider_ref TEXT, proof_url TEXT, notes TEXT, plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client read own payments" ON payments FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- إضافة أعمدة حالة الباقة للشركات
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active','pending','expired'));
