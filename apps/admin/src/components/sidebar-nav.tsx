'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  /** Sub-sections rendered under the parent when it is active. */
  children?: readonly { href: string; label: string }[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tuition', label: 'Tuition & Tutors' },
  {
    href: '/communities',
    label: 'Communities',
    children: [
      { href: '/communities', label: 'All Communities' },
      { href: '/communities/pending', label: 'Pending Requests' },
      { href: '/communities/reports', label: 'Reports' },
      { href: '/communities/categories', label: 'Categories' },
      { href: '/communities/members', label: 'Members' },
      { href: '/communities/moderation', label: 'Moderation' },
    ],
  },
  { href: '/users', label: 'Users' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/master-data', label: 'Master Data' },
  { href: '/education-institutions', label: 'Education Institutions' },
  { href: '/settings', label: 'Platform Settings' },
] as const;

/** Sidebar navigation with active-route highlighting + sub-sections. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Admin sections">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <div key={item.href} className="flex flex-col">
            <Link
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
            {active && item.children && (
              <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-zinc-300 pl-3">
                {item.children.map((child) => {
                  const childActive =
                    child.href === item.href
                      ? pathname === child.href
                      : pathname.startsWith(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-current={childActive ? 'page' : undefined}
                      className={[
                        'rounded-md px-2 py-1.5 text-[13px] transition',
                        childActive
                          ? 'font-semibold text-indigo-700'
                          : 'text-zinc-500 hover:text-zinc-900',
                      ].join(' ')}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
