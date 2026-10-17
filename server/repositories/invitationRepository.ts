import type { Db } from '../infrastructure/prisma.js';
import type { CoupleProfile, MediaType, TemplateId, ThemePreset, ThemeSettings } from '../../shared/types.js';

export type InvitationCore = CoupleProfile & ThemeSettings & { id: string };

type Row = NonNullable<Awaited<ReturnType<Db['invitation']['findUnique']>>>;

const toDomain = (r: Row): InvitationCore => ({
  id: r.id,
  groomName: r.groomName,
  groomShortName: r.groomShortName,
  groomParents: r.groomParents,
  groomInstagram: r.groomInstagram ?? undefined,
  groomPhoto: r.groomPhoto,
  brideName: r.brideName,
  brideShortName: r.brideShortName,
  brideParents: r.brideParents,
  brideInstagram: r.brideInstagram ?? undefined,
  bridePhoto: r.bridePhoto,
  heroImage: r.heroImage,
  heroVideoUrl: r.heroVideoUrl ?? undefined,
  heroMediaType: r.heroMediaType as MediaType,
  quoteText: r.quoteText,
  quoteSource: r.quoteSource,
  weddingDate: r.weddingDate.toISOString(),
  countdownTarget: r.countdownTarget.toISOString(),
  musicUrl: r.musicUrl,
  musicTitle: r.musicTitle,
  whatsappNumber: r.whatsappNumber,
  whatsappTemplate: r.whatsappTemplate,
  templateId: r.templateId as TemplateId,
  themeColor: r.themeColor as ThemePreset,
});

/** Only the columns a caller may write; dates arrive as ISO strings. */
function toData(patch: Partial<InvitationCore>) {
  const { id: _id, weddingDate, countdownTarget, ...rest } = patch;
  return {
    ...rest,
    ...(weddingDate ? { weddingDate: new Date(weddingDate) } : {}),
    ...(countdownTarget ? { countdownTarget: new Date(countdownTarget) } : {}),
  };
}

export function invitationRepository(db: Db) {
  return {
    async get(): Promise<InvitationCore | null> {
      const row = await db.invitation.findUnique({ where: { id: 'main' } });
      return row ? toDomain(row) : null;
    },

    async update(patch: Partial<InvitationCore>): Promise<InvitationCore> {
      return toDomain(await db.invitation.update({ where: { id: 'main' }, data: toData(patch) }));
    },
  };
}

export type InvitationRepository = ReturnType<typeof invitationRepository>;
