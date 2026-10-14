/** Every React Query key in one place, so invalidations always match the queries they target. */
export const queryKeys = {
  invitation: ['invitation'] as const,
  guestbook: ['guestbook'] as const,

  cms: {
    stats: ['cms', 'stats'] as const,
    general: ['cms', 'general'] as const,
    couple: ['cms', 'couple'] as const,
    theme: ['cms', 'theme'] as const,
    events: ['cms', 'events'] as const,
    stories: ['cms', 'stories'] as const,
    gifts: ['cms', 'gifts'] as const,
    gallery: ['cms', 'gallery'] as const,
    wishes: ['cms', 'wishes'] as const,
    invitedGuests: ['cms', 'invited-guests'] as const,
    photoMoments: ['cms', 'photo-moments'] as const,
    frame: ['cms', 'frame'] as const,
  },
};
