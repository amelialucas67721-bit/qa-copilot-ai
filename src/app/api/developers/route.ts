import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

type DeveloperRequest = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const developers = await sql`
    SELECT id, name, email, role, "createdAt"
    FROM "user"
    WHERE role = 'developer'
    ORDER BY "createdAt" DESC
  `;

  return Response.json({ developers });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as DeveloperRequest;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !email || !password) {
    return Response.json({ error: 'Name, email and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const existing = await sql`SELECT id, role FROM "user" WHERE LOWER(email) = LOWER(${email})`;

    if (existing[0]) {
      const [developer] = await sql`
        UPDATE "user"
        SET name = ${name}, role = 'developer', "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id, name, email, role, "createdAt"
      `;

      return Response.json({ developer, message: 'Existing user marked as developer' });
    }

    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
      headers: await headers(),
    });

    const [developer] = await sql`
      UPDATE "user"
      SET role = 'developer', "updatedAt" = NOW()
      WHERE id = ${result.user.id}
      RETURNING id, name, email, role, "createdAt"
    `;

    return Response.json({ developer });
  } catch (error) {
    console.error('Error creating developer:', error);
    return Response.json({ error: 'Failed to add developer' }, { status: 500 });
  }
}
