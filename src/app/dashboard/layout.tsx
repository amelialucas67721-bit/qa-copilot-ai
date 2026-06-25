import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/account/signin?callbackUrl=/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0f] flex">
      <DashboardNav user={session.user} />
      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
