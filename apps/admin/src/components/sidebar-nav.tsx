'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  /** Sub-sections rendered under the parent when it is active. */
  children?: readonly { href: string; label: string }[];
}

interface NavGroup {
  title: string;
  items: readonly NavItem[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/', label: 'Dashboard' }],
  },
  {
    title: 'Content',
    items: [
      {
        href: '/opportunities',
        label: 'Opportunities',
        children: [
          { href: '/opportunities', label: 'All' },
          { href: '/opportunities?type=scholarship', label: 'Scholarships' },
          { href: '/opportunities/new', label: 'Create new' },
        ],
      },
      { href: '/tuition', label: 'Tuition & Tutors' },
      {
        href: '/tolet',
        label: 'Bachelor To-Let',
        children: [
          { href: '/tolet', label: 'All listings' },
          { href: '/tolet/pending', label: 'Pending review' },
          { href: '/tolet/reports', label: 'Reports' },
        ],
      },
      {
        href: '/hub',
        label: 'Student Hub',
        children: [
          { href: '/hub', label: 'All listings' },
          { href: '/hub/pending', label: 'Pending review' },
          { href: '/hub/categories', label: 'Categories' },
          { href: '/hub/reports', label: 'Reports' },
          { href: '/hub/book-exchange', label: 'Book Exchange' },
          { href: '/hub/research', label: 'Research Partners' },
        ],
      },
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
      { href: '/mess', label: 'Mess Management' },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/users', label: 'Users' },
      { href: '/notifications', label: 'Notifications' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/education-institutions', label: 'Education Institutions' },
      { href: '/settings', label: 'Platform Settings' },
    ],
  },
] as const;

/** Sidebar navigation with grouped sections, active-route highlighting and
 *  sub-sections. Reference rows (skills, subjects, categories, universities)
 *  are managed inside the section that owns them. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4" aria-label="Admin sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
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
                            : child.href.includes('?')
                              ? false
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
          </div>
        </div>
      ))}
    </nav>
  );
}
