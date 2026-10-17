import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TemplateId } from '@shared/types';

/**
 * Each template is its own chunk, so a guest downloads only the design the couple picked.
 * Every template reads the same data from InvitationContext and offers the same features.
 */
export const TEMPLATE_COMPONENTS: Record<TemplateId, LazyExoticComponent<ComponentType>> = {
  nusantara: lazy(() => import('./nusantara/NusantaraTemplate.js')),
  gulungan: lazy(() => import('./gulungan/GulunganTemplate.js')),
  bilik: lazy(() => import('./bilik/BilikTemplate.js')),
  cozy: lazy(() => import('./cozy/CozyTemplate.js')),
};
