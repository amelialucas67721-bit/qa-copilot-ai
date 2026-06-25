import sql from '@/app/api/utils/sql';

export async function ensurePaymentOrdersTable() {
  await sql`
    INSERT INTO pricing_plans
      (name, slug, description, price_monthly, price_yearly, features, limits, is_popular, sort_order)
    VALUES
      (
        'Free',
        'free',
        'Perfect for individuals getting started',
        0,
        0,
        '["100 AI test cases/month","1 project","Manual export","Community support"]',
        '{"test_cases":100,"projects":1,"team_members":1}',
        FALSE,
        1
      ),
      (
        'Starter',
        'starter',
        'Great for small QA teams',
        49,
        470,
        '["Unlimited test cases","5 projects","Excel/PDF export","Email support","Test management"]',
        '{"test_cases":-1,"projects":5,"team_members":3}',
        FALSE,
        2
      ),
      (
        'Professional',
        'professional',
        'For growing QA teams and agencies',
        149,
        1430,
        '["Everything in Starter","Autonomous testing","Video recordings","Jira integration","Unlimited projects","Priority support"]',
        '{"test_cases":-1,"projects":-1,"team_members":10}',
        TRUE,
        3
      ),
      (
        'Enterprise',
        'enterprise',
        'Custom solutions for large teams',
        0,
        0,
        '["Everything in Pro","Unlimited team members","RBAC & audit logs","SSO integration","Custom integrations","Dedicated support"]',
        '{"test_cases":-1,"projects":-1,"team_members":-1}',
        FALSE,
        4
      )
    ON CONFLICT (slug) DO NOTHING
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
    ON payment_orders(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_paypal_order_id
    ON payment_orders(paypal_order_id)
  `;
}
