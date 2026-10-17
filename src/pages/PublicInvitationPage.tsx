import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { useThemePreset } from '../lib/theme.js';
import { ErrorState, LoadingState } from '../components/ui/StateView.js';
import { InvitationProvider } from '../features/invitation/InvitationContext.js';
import { TEMPLATE_COMPONENTS } from '../features/invitation/templates/registry.js';

export const PublicInvitationPage: React.FC = () => {
  const { data: invitation, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  useThemePreset(invitation);

  if (isLoading) return <LoadingState label="Menyiapkan undangan..." className="min-h-dvh" />;
  if (isError || !invitation) {
    return (
      <ErrorState
        title="Undangan belum bisa dimuat."
        detail="Periksa koneksi internet Anda, lalu coba lagi."
        onRetry={() => refetch()}
        className="min-h-dvh justify-center px-6"
      />
    );
  }

  const Template = TEMPLATE_COMPONENTS[invitation.templateId] || TEMPLATE_COMPONENTS.nusantara;
  return (
    <InvitationProvider invitation={invitation}>
      <Suspense fallback={<LoadingState label="Menyiapkan undangan..." className="min-h-dvh" />}>
        <Template />
      </Suspense>
    </InvitationProvider>
  );
};
