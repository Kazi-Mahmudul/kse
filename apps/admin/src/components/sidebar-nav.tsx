'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tuition', label: 'Tuition & Tutors' },
  { href: '/communities', label: 'Communities' },
  { href: '/users', label: 'Users' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/master-data', label: 'Master Data' },
  { href: '/settings', label: 'Platform Settings' },
] as const;

/** Sidebar navigation with active-route highlighting. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Admin sections">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'rounded-lg px-3 py-2 text-sm font-medium transition',
              active
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
