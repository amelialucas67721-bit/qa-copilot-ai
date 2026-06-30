'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  TestTube2,
  Play,
  Bug,
  BarChart3,
  LogOut,
  ChevronRight,
  Shield,
  ShieldCheck,
  CreditCard,
  Sun,
  Moon,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface DashboardNavProps {
  user: {
    name: string;
    email: string;
    role?: string;
    image?: string | null;
    [key: string]: unknown;
  };
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const allNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/projects', label: 'Projects', icon: FileText, exact: false },
    { href: '/dashboard/test-cases', label: 'Test Cases', icon: TestTube2, exact: false },
    { href: '/dashboard/test-runs', label: 'Test Runs', icon: Play, exact: false },
    { href: '/dashboard/defects', label: 'Defects', icon: Bug, exact: false },
    { href: '/dashboard/security', label: 'Security Testing', icon: ShieldCheck, exact: false },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, exact: false },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, exact: false },
    { href: '/dashboard/developers', label: 'Add Developers', icon: UserPlus, exact: false },
  ];
  const navItems =
    user.role === 'developer'
      ? [{ href: '/dashboard/defects', label: 'Defects', icon: Bug, exact: false }]
      : allNavItems;

  useEffect(() => {
    if (user.role === 'developer' && !pathname.startsWith('/dashboard/defects')) {
      router.replace('/dashboard/defects');
    }
  }, [pathname, router, user.role]);

  const isActive = (item: { href: string; exact: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#0f1117] flex flex-col z-50 border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-white tracking-tight">QA Copilot AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-violet-600/15 text-violet-400'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-violet-400' : ''}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-violet-400/60" />}
            </Link>
          );
        })}

        {user.role === 'admin' && (
          <div className="pt-3 mt-2 border-t border-white/5">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-2">
              Admin
            </p>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-white/50 hover:text-white/90 hover:bg-white/5"
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 pb-2 flex-shrink-0">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/90 hover:bg-white/5 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 flex-shrink-0 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 flex-shrink-0 text-violet-400" />
          )}
          <span className="flex-1 text-left">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              theme === 'dark'
                ? 'bg-amber-400/15 text-amber-400'
                : 'bg-violet-400/15 text-violet-400'
            }`}
          >
            {theme === 'dark' ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
            <p className="text-xs text-white/35 truncate">{user.email}</p>
          </div>
          <Link href="/account/logout" title="Sign out">
            <LogOut className="w-4 h-4 text-white/30 hover:text-white/70 transition-colors" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
