import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicInvitationPage } from './pages/PublicInvitationPage.js';
import { LoadingState } from './components/ui/StateView.js';

// Guests only download the invitation; the camera page and the CMS load on demand.
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const PhotoMomentsPage = named(() => import('./pages/PhotoMomentsPage.js'), 'PhotoMomentsPage');
const CMSLoginPage = named(() => import('./pages/cms/CMSLoginPage.js'), 'CMSLoginPage');
const CMSLayout = named(() => import('./pages/cms/CMSLayout.js'), 'CMSLayout');
const CMSOverviewTab = named(() => import('./pages/cms/tabs/CMSOverviewTab.js'), 'CMSOverviewTab');
const CMSCoupleTab = named(() => import('./pages/cms/tabs/CMSCoupleTab.js'), 'CMSCoupleTab');
const CMSEventsTab = named(() => import('./pages/cms/tabs/CMSEventsTab.js'), 'CMSEventsTab');
const CMSStoriesTab = named(() => import('./pages/cms/tabs/CMSStoriesTab.js'), 'CMSStoriesTab');
const CMSGalleryTab = named(() => import('./pages/cms/tabs/CMSGalleryTab.js'), 'CMSGalleryTab');
const CMSPhotoMomentsTab = named(() => import('./pages/cms/tabs/CMSPhotoMomentsTab.js'), 'CMSPhotoMomentsTab');
const CMSGuestbookTab = named(() => import('./pages/cms/tabs/CMSGuestbookTab.js'), 'CMSGuestbookTab');
const CMSReceptionPage = named(() => import('./pages/cms/tabs/CMSReceptionPage.js'), 'CMSReceptionPage');
const CMSGiftsTab = named(() => import('./pages/cms/tabs/CMSGiftsTab.js'), 'CMSGiftsTab');
const CMSThemeTab = named(() => import('./pages/cms/tabs/CMSThemeTab.js'), 'CMSThemeTab');
const CMSSettingsTab = named(() => import('./pages/cms/tabs/CMSSettingsTab.js'), 'CMSSettingsTab');

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState label="Memuat..." className="min-h-dvh" />}>
        <Routes>
          <Route path="/" element={<PublicInvitationPage />} />
          <Route path="/photo-moments" element={<PhotoMomentsPage />} />
          <Route path="/cms/login" element={<CMSLoginPage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
