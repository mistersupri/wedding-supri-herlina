import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { QRScannerDesk } from '../../../components/cms/QRScannerDesk.js';
import { fetchCMSInvitedGuests, submitCMSPresensiCheckIn } from '../../../lib/api.js';

export const CMSReceptionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useOutletContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>();

  const { data: guestsData, isLoading } = useQuery({
    queryKey: ['cms-invited-guests'],
    queryFn: () => fetchCMSInvitedGuests('ALL', ''),
  });

  const guests = guestsData?.data || [];

  const checkInMutation = useMutation({
    mutationFn: submitCMSPresensiCheckIn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cms-invited-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-guests'] });
      queryClient.invalidateQueries({ queryKey: ['cms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guestWishes'] });
    },
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-stone-500">
        <div className="w-8 h-8 rounded-full border-3 border-[#5A5A40]/40 border-t-[#5A5A40] animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold">Memuat data penerimaan tamu...</p>
      </div>
    );
  }

  return (
    <QRScannerDesk
      guests={guests}
      onCheckIn={async (payload) => {
        return checkInMutation.mutateAsync({
          guestId: payload.guestId,
          actualPax: payload.actualPax,
          souvenirGiven: payload.souvenirGiven,
          method: 'QR_SCAN',
        });
      }}
      showToast={showToast}
    />
  );
};
