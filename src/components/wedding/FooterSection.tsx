import React from 'react';
import { Link } from 'react-router-dom';
import { KawungDivider } from '../ui/Kawung.js';
import type { InvitationData } from '../../types.js';

/** Closing band, the counterpart of the cover. */
export const FooterSection: React.FC<{ invitation: InvitationData; isAuthenticated: boolean }> = ({ invitation, isAuthenticated }) => (
  <footer className="on-deep kawung-field px-5 pt-20 pb-32 text-center">
    <div className="mx-auto max-w-xl">
      <p className="text-[15px] leading-relaxed text-on-deep-soft sm:text-base">
        Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.
      </p>
      <KawungDivider tone="deep" className="my-8" />
      <p className="text-sm text-on-deep-soft">Kami yang berbahagia,</p>
      <p className="mt-2 font-display text-5xl italic sm:text-6xl">
        {invitation.groomShortName} <span className="text-prada-on-deep not-italic">&amp;</span> {invitation.brideShortName}
      </p>
      {isAuthenticated && (
        <Link
          to="/cms/overview"
          className="mt-10 inline-flex min-h-11 items-center text-sm text-on-deep-soft underline underline-offset-4 hover:text-on-deep"
        >
          Kelola undangan di CMS
        </Link>
      )}
    </div>
  </footer>
);
