import React from 'react';
import { CalendarDays, Camera, Gift, Images, MessageSquareText, QrCode, UsersRound, type LucideIcon } from 'lucide-react';
import { useActiveSection } from '../../hooks/useActiveSection.js';
import { KawungMark } from '../ui/Kawung.js';

type NavItem =
  | { kind: 'section'; id: string; label: string; icon: LucideIcon }
  | { kind: 'link'; href: string; label: string; icon: LucideIcon }
  | { kind: 'action'; onClick: () => void; label: string; icon: LucideIcon };

interface BottomNavProps {
  sections: { id: string; label: string }[];
  photoMomentsHref?: string;
  onShowPass?: () => void;
}

// Each icon names its section literally (calendar for the schedule, gift for gifts); there is no decorative icon.
const SECTION_ICONS: Record<string, LucideIcon> = {
  'couple-section': UsersRound,
  'events-section': CalendarDays,
  'gallery-section': Images,
  'guestbook-section': MessageSquareText,
  'gifts-section': Gift,
};

export const BottomNav: React.FC<BottomNavProps> = ({ sections, photoMomentsHref, onShowPass }) => {
  const active = useActiveSection(sections.map((s) => s.id));

  const items: NavItem[] = [
    ...sections.map((s) => ({ kind: 'section' as const, id: s.id, label: s.label, icon: SECTION_ICONS[s.id] })),
    ...(onShowPass ? [{ kind: 'action' as const, onClick: onShowPass, label: 'Kartu', icon: QrCode }] : []),
    ...(photoMomentsHref ? [{ kind: 'link' as const, href: photoMomentsHref, label: 'Kamera', icon: Camera }] : []),
  ];

  const itemClass = (isActive: boolean) =>
    `relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors ${
      isActive ? 'text-primary' : 'text-ink-soft hover:text-ink'
    }`;

  return (
    <nav
      aria-label="Navigasi undangan"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (isActive: boolean) => (
            <>
              {isActive && <KawungMark className="absolute top-1 h-2.5 w-2.5 text-prada" />}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </>
          );
          if (item.kind === 'section') {
            const isActive = active === item.id;
            return (
              <li key={item.id} className="flex flex-1">
                <a href={`#${item.id}`} aria-current={isActive ? 'location' : undefined} className={itemClass(isActive)}>
                  {content(isActive)}
                </a>
              </li>
            );
          }
          if (item.kind === 'link') {
            return (
              <li key="link" className="flex flex-1">
                <a href={item.href} className={itemClass(false)}>
                  {content(false)}
                </a>
              </li>
            );
          }
          return (
            <li key="action" className="flex flex-1">
              <button type="button" onClick={item.onClick} className={itemClass(false)}>
                {content(false)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
