'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  ChevronRight,
  BarChart3,
  ExternalLink,
  LayoutTemplate,
} from 'lucide-react';

interface AdminNavProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    [key: string]: unknown;
  };
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/admin/customers', label: 'Customers', icon: Users, exact: false },
    { href: '/admin/plans', label: 'Pricing Plans', icon: CreditCard, exact: false },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3, exact: false },
    { href: '/admin/footer', label: 'Footer', icon: LayoutTemplate, exact: false },
  ];

  const isActive = (item: { href: string; exact: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'A';

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#0f1117] flex flex-col z-50 border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-[15px] font-semibold text-white tracking-tight block leading-none">
            Admin Panel
          </span>
          <span className="text-[10px] text-white/30">QA Copilot AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-3">
          Management
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-rose-600/15 text-rose-400'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-rose-400' : ''}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-rose-400/60" />}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-3">
            Switch
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/90 hover:bg-white/5 transition-all"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>Customer App</span>
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
            <p className="text-xs text-rose-400/70 truncate font-medium">Administrator</p>
          </div>
          <Link href="/account/logout" title="Sign out">
            <LogOut className="w-4 h-4 text-white/30 hover:text-white/70 transition-colors" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
