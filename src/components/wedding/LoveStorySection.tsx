import React from 'react';
import { Reveal } from '../ui/Reveal.js';
import type { LoveStoryItem } from '@shared/types';

/** Milestones alternate sides on wide screens; the year is the large typographic anchor of each. */
export const LoveStorySection: React.FC<{ stories: LoveStoryItem[] }> = ({ stories }) => {
  if (stories.length === 0) return null;

  return (
    <section id="story-section" aria-labelledby="story-heading" className="bg-paper-2 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2 id="story-heading" className="font-display text-4xl italic sm:text-5xl">
            Perjalanan kami
          </h2>
        </Reveal>

        <ol className="mt-14 space-y-16 sm:space-y-24">
          {stories.map((story, i) => {
            const flip = i % 2 === 1;
            return (
              <Reveal
                as="li"
                key={story.id}
                className={`grid items-center gap-6 md:grid-cols-2 md:gap-14 ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                {story.photoUrl ? (
                  <div className={`gunungan mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden bg-paper ${flip ? 'md:ml-0' : 'md:mr-0'}`}>
                    <img
                      src={story.photoUrl}
                      alt={story.title}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div aria-hidden="true" className="hidden md:block" />
                )}
                <div className={flip ? 'md:text-right' : ''}>
                  <p className="display-numeral text-6xl leading-none text-prada-ink sm:text-7xl">{story.year}</p>
                  <h3 className="mt-3 font-display text-2xl sm:text-3xl">{story.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">{story.description}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
