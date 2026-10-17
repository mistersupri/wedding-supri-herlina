import React from 'react';
import { KawungDivider } from '../ui/Kawung.js';
import { useInvitation } from '../../features/invitation/InvitationContext.js';
import { Reveal } from '../ui/Reveal.js';

interface PersonProps {
  role: string;
  name: string;
  parents: string;
  photo: string;
  instagram?: string;
  /** Bride's column sits lower on wide screens, so the pair reads as a staggered spread. */
  offset?: boolean;
}

const Person: React.FC<PersonProps> = ({ role, name, parents, photo, instagram, offset }) => (
  <Reveal className={`flex flex-col items-center text-center md:items-start md:text-left ${offset ? 'md:mt-40' : ''}`}>
    <div className="gunungan aspect-[3/4] w-56 overflow-hidden bg-paper sm:w-64">
      <img src={photo} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
    </div>
    <p className="mt-6 text-sm text-prada-ink">{role}</p>
    <h3 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{name}</h3>
    <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-soft">{parents}</p>
    {instagram && (
      <a
        href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline decoration-prada underline-offset-4 hover:decoration-2"
      >
        @{instagram.replace(/^@/, '')} di Instagram
      </a>
    )}
  </Reveal>
);

/** Salam, the chosen verse, and the two of them. */
export const CoupleSection: React.FC = () => {
  const { invitation } = useInvitation();
  return (
    <>
      <section aria-label="Salam pembuka" className="px-5 py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <KawungDivider className="mb-8" />
          {invitation.quoteText && (
            <figure>
              <blockquote className="font-display text-[clamp(1.35rem,4.5vw,2rem)] leading-snug italic">{invitation.quoteText}</blockquote>
              {invitation.quoteSource && (
                <figcaption className="mt-5 text-sm font-semibold text-prada-ink">{invitation.quoteSource}</figcaption>
              )}
            </figure>
          )}
        </Reveal>
      </section>

      <section id="couple-section" aria-labelledby="couple-heading" className="bg-paper-2 px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 id="couple-heading" className="font-display text-3xl sm:text-4xl">
              Assalamu&rsquo;alaikum Warahmatullahi Wabarakatuh
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-base">
              Dengan memohon rahmat dan ridho Allah Subhanahu wa Ta&rsquo;ala, kami bermaksud menyelenggarakan pernikahan putra-putri kami:
            </p>
          </Reveal>

          <div className="relative mt-16 grid gap-16 md:grid-cols-2 md:gap-10">
            <Person
              role="Mempelai pria"
              name={invitation.groomName}
              parents={invitation.groomParents}
              photo={invitation.groomPhoto}
              instagram={invitation.groomInstagram}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-6 left-1/2 hidden -translate-x-1/2 font-display text-[9rem] leading-none text-prada/45 italic md:block"
            >
              &amp;
            </span>
            <Person
              role="Mempelai wanita"
              name={invitation.brideName}
              parents={invitation.brideParents}
              photo={invitation.bridePhoto}
              instagram={invitation.brideInstagram}
              offset
            />
          </div>
        </div>
      </section>
    </>
  );
};
