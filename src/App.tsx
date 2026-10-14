import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicInvitationPage } from './pages/PublicInvitationPage.js';
import { PhotoMomentsPage } from './pages/PhotoMomentsPage.js';
import { CMSLoginPage } from './pages/cms/CMSLoginPage.js';
import { CMSLayout } from './pages/cms/CMSLayout.js';
import { CMSOverviewTab } from './pages/cms/tabs/CMSOverviewTab.js';
import { CMSCoupleTab } from './pages/cms/tabs/CMSCoupleTab.js';
import { CMSEventsTab } from './pages/cms/tabs/CMSEventsTab.js';
import { CMSStoriesTab } from './pages/cms/tabs/CMSStoriesTab.js';
import { CMSGalleryTab } from './pages/cms/tabs/CMSGalleryTab.js';
import { CMSPhotoMomentsTab } from './pages/cms/tabs/CMSPhotoMomentsTab.js';
import { CMSGuestbookTab } from './pages/cms/tabs/CMSGuestbookTab.js';
import { CMSReceptionPage } from './pages/cms/tabs/CMSReceptionPage.js';
import { CMSGiftsTab } from './pages/cms/tabs/CMSGiftsTab.js';
import { CMSThemeTab } from './pages/cms/tabs/CMSThemeTab.js';
import { CMSSettingsTab } from './pages/cms/tabs/CMSSettingsTab.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Wedding Invitation */}
        <Route path="/" element={<PublicInvitationPage />} />
        <Route path="/photo-moments" element={<PhotoMomentsPage />} />

        {/* CMS Dedicated Login */}
        <Route path="/cms/login" element={<CMSLoginPage />} />

        {/* CMS Admin Panel Layout & Sub-Routes */}
        <Route path="/cms" element={<CMSLayout />}>
          <Route index element={<Navigate to="/cms/overview" replace />} />
          <Route path="overview" element={<CMSOverviewTab />} />
          <Route path="mempelai" element={<CMSCoupleTab />} />
          <Route path="acara" element={<CMSEventsTab />} />
          <Route path="cerita" element={<CMSStoriesTab />} />
          <Route path="galeri" element={<CMSGalleryTab />} />
          <Route path="photo-moments" element={<CMSPhotoMomentsTab />} />
          <Route path="tamu" element={<CMSGuestbookTab />} />
          <Route path="penerimaan-tamu" element={<CMSReceptionPage />} />
          <Route path="kado" element={<CMSGiftsTab />} />
          <Route path="tema" element={<CMSThemeTab />} />
          <Route path="pengaturan" element={<CMSSettingsTab />} />
          <Route path="*" element={<Navigate to="/cms/overview" replace />} />
        </Route>

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
