import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

// One-time setup endpoint: promotes the currently logged-in user to admin.
// Protected by a setup key so random users can't promote themselves.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Must be logged in' }, { status: 401 });

  const adminSetupKey = process.env.ADMIN_SETUP_KEY;
  if (!adminSetupKey) {
    return Response.json({ error: 'Admin setup is not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.key !== adminSetupKey) {
    return Response.json({ error: 'Invalid admin setup key' }, { status: 403 });
  }

  await sql`UPDATE "user" SET role = 'admin', "updatedAt" = NOW() WHERE id = ${session.user.id}`;

  return Response.json({
    success: true,
    message: `${session.user.email} is now an admin. Please sign out and sign back in.`,
  });
}
