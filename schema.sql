-- ============================================================
-- QA Copilot AI — Complete Database Schema
-- Run this file against a fresh PostgreSQL 15+ database
-- Usage: psql "$DATABASE_URL" -f schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- AUTH TABLES (better-auth)
-- ============================================================

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  scope TEXT,
  "idToken" TEXT,
  password TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider ON "account"("providerId", "accountId");

-- ============================================================
-- PRICING & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','cancelled','expired','trialing','past_due')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','yearly')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_user_id ON customer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_plan_id ON customer_subscriptions(plan_id);

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id) ON DELETE SET NULL,
  paypal_order_id TEXT NOT NULL UNIQUE,
  paypal_payer_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL
    CHECK (billing_cycle IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','cancelled')),
  plan_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_paypal_order_id ON payment_orders(paypal_order_id);

-- Seed default pricing plans
INSERT INTO pricing_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_popular, sort_order)
VALUES
  ('Free', 'free', 'Perfect for individuals getting started', 0, 0,
   '["100 AI test cases/month","1 project","Manual export","Community support"]',
   '{"test_cases":100,"projects":1,"team_members":1}', FALSE, 1),

  ('Starter', 'starter', 'Great for small QA teams', 49, 470,
   '["Unlimited test cases","5 projects","Excel/PDF export","Email support","Test management"]',
   '{"test_cases":-1,"projects":5,"team_members":3}', FALSE, 2),

  ('Professional', 'professional', 'For growing QA teams and agencies', 149, 1430,
   '["Everything in Starter","Autonomous testing","Video recordings","Jira integration","Unlimited projects","Priority support"]',
   '{"test_cases":-1,"projects":-1,"team_members":10}', TRUE, 3),

  ('Enterprise', 'enterprise', 'Custom solutions for large teams', 0, 0,
   '["Everything in Pro","Unlimited team members","RBAC & audit logs","SSO integration","Custom integrations","Dedicated support"]',
   '{"test_cases":-1,"projects":-1,"team_members":-1}', FALSE, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','archived','completed')),
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- ============================================================
-- REQUIREMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  requirement_type TEXT
    CHECK (requirement_type IN ('BRD','PRD','user_story','acceptance_criteria','functional')),
  status TEXT DEFAULT 'analyzing'
    CHECK (status IN ('analyzing','analyzed','completed')),
  ai_analysis JSONB,
  modules JSONB,
  pages JSONB,
  features JSONB,
  user_flows JSONB,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);

-- ============================================================
-- MODULES / PAGES / FEATURES (requirement breakdown)
-- ============================================================

CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEST CASES
-- ============================================================

CREATE TABLE IF NOT EXISTS test_cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_case_id TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  feature_id UUID REFERENCES features(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  test_scenario TEXT NOT NULL,
  preconditions TEXT,
  test_steps JSONB NOT NULL DEFAULT '[]',
  test_data TEXT,
  expected_result TEXT NOT NULL,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('critical','major','moderate','minor')),
  test_type TEXT NOT NULL
    CHECK (test_type IN ('functional','ui','negative','validation','boundary','api','regression')),
  automation_candidate BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','ready','in_progress','completed')),
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_requirement_id ON test_cases(requirement_id);

-- ============================================================
-- TEST SUITES
-- ============================================================

CREATE TABLE IF NOT EXISTS test_suites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_suite_cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  execution_order INTEGER,
  UNIQUE(test_suite_id, test_case_id)
);

-- ============================================================
-- TEST RUNS
-- ============================================================

CREATE TABLE IF NOT EXISTS test_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  test_suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  environment TEXT CHECK (environment IN ('development','staging','production')),
  base_url TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','cancelled')),
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_runs_project_id ON test_runs(project_id);

-- ============================================================
-- TEST EXECUTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS test_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','running','passed','failed','skipped','blocked')),
  execution_time INTEGER,
  error_message TEXT,
  screenshots JSONB,
  video_url TEXT,
  browser_logs JSONB,
  network_logs JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_executions_test_run_id ON test_executions(test_run_id);

-- ============================================================
-- DEFECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS defects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  defect_id TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  test_execution_id UUID REFERENCES test_executions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_result TEXT,
  actual_result TEXT,
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('critical','major','moderate','minor')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed','rejected')),
  root_cause_suggestion TEXT,
  screenshots JSONB,
  video_url TEXT,
  browser_logs JSONB,
  jira_ticket_id TEXT,
  jira_ticket_url TEXT,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  assigned_to TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_project_id ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_assigned_to ON defects(assigned_to);
CREATE UNIQUE INDEX IF NOT EXISTS idx_defects_test_execution_id
  ON defects(test_execution_id)
  WHERE test_execution_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS defect_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_comments_defect_id ON defect_comments(defect_id);

-- ============================================================
-- SECURITY TESTING
-- ============================================================

CREATE TABLE IF NOT EXISTS security_scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_url TEXT,
  description TEXT,
  scan_types JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed')),
  severity_summary JSONB DEFAULT '{"critical":0,"high":0,"medium":0,"low":0,"info":0}',
  ai_summary TEXT,
  total_findings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_findings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES security_scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('critical','high','medium','low','info')),
  description TEXT NOT NULL,
  affected_area TEXT,
  steps_to_reproduce TEXT,
  recommendation TEXT,
  vulnerability_references TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','confirmed','false_positive','fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_scans_project_id ON security_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_created_by ON security_scans(created_by);
CREATE INDEX IF NOT EXISTS idx_security_findings_scan_id ON security_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON security_findings(severity);

-- ============================================================
-- WEBSITE INVENTORY (for automated testing)
-- ============================================================

CREATE TABLE IF NOT EXISTS website_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_type TEXT,
  forms JSONB,
  buttons JSONB,
  links JSONB,
  inputs JSONB,
  menus JSONB,
  user_journeys JSONB,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- Done!
-- ============================================================
