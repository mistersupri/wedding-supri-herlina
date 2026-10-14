import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { InvitedGuestsPanel } from '../../../components/cms/guests/InvitedGuestsPanel.js';
import { WishesModeration } from '../../../components/cms/guests/WishesModeration.js';
import { buttonClass } from '../../../components/ui/Button.js';

type View = 'invited' | 'wishes';

export const CMSGuestbookTab: React.FC = () => {
  const [view, setView] = useState<View>('invited');

  return (
    <>
      <PageHeader
        title="Daftar tamu & ucapan"
        description="Kelola undangan pribadi berkode 4 karakter, kirim lewat WhatsApp, dan moderasi ucapan yang masuk."
        actions={
          <Link to="/cms/penerimaan-tamu" className={buttonClass('secondary')}>
            Meja penerima tamu
          </Link>
        }
      />

      <div role="group" aria-label="Tampilan" className="mb-6 flex gap-1 border-b border-line">
        {(
          [
            ['invited', 'Tamu undangan'],
            ['wishes', 'Ucapan & RSVP'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`-mb-px min-h-11 border-b-2 px-4 text-[15px] font-semibold ${view === id ? 'border-primary text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'invited' ? <InvitedGuestsPanel /> : <WishesModeration />}
    </>
  );
};
