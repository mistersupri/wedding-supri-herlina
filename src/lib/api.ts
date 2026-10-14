import {
  InvitationData,
  GuestWish,
  AdminUser,
  AuthResponse,
  WeddingEvent,
  GalleryPhoto,
  LoveStoryItem,
  GiftAccount,
  AttendanceStatus,
  CMSCoupleData,
  CMSThemeData,
  CMSStatsData,
  CMSGeneralData,
  InvitedGuest,
  GuestAccessVerification,
  PresensiStats,
  PresensiCheckInPayload,
  PhotoMoment,
  PhotoFrameConfig,
} from '../types.js';

const API_BASE = '/api';
const TOKEN_KEY = 'wedding_admin_token';
const REFRESH_TOKEN_KEY = 'wedding_admin_refresh_token';

// Token storage helpers
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Single active refresh promise to avoid concurrent duplicate refresh requests
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearAuthTokens();
    return null;
  }

  // If already refreshing, reuse the ongoing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.accessToken) {
        clearAuthTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return null;
      }

      const { accessToken, refreshToken: newRefreshToken } = data.data;
      setAuthTokens(accessToken, newRefreshToken || currentRefreshToken);
      return accessToken;
    } catch (err) {
      console.error('Failed to refresh authentication token:', err);
      clearAuthTokens();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Authenticated fetch returning full response JSON (useful for endpoints with sibling fields like stats)
 */
export async function fetchWithAuthRaw<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  // If 401 Unauthorized occurs, attempt token refresh and replay the request once
  if (res.status === 401) {
    const newAccessToken = await refreshAuthToken();
    if (newAccessToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      res = await fetch(url, { ...init, headers: retryHeaders });
    } else {
      clearAuthTokens();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Sesi Anda telah kedaluwarsa. Silakan login kembali.');
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Permintaan gagal dengan status ${res.status}`);
  }

  return json as unknown as T;
}

/**
 * Intelligent authenticated fetch wrapper with automatic JWT Refresh Token retry
 */
export async function fetchWithAuth<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const json = await fetchWithAuthRaw<any>(url, init);
  return json.data !== undefined ? json.data : (json as unknown as T);
}

// ==========================================
// PUBLIC INVITATION APIS (Safe, no credentials)
// ==========================================
export async function fetchInvitationData(): Promise<InvitationData> {
  const res = await fetch(`${API_BASE}/invitation`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Gagal mengambil data undangan');
  return data.data;
}

export const fetchInvitationSettings = fetchInvitationData;

export async function fetchGuestWishes(): Promise<{ data: GuestWish[]; stats: any }> {
  const res = await fetch(`${API_BASE}/public/guestbook`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Gagal mengambil buku tamu');
  return {
    data: Array.isArray(data.data) ? data.data : [],
    stats: data.stats || {
      totalWishes: 0,
      attendingCount: 0,
      declinedCount: 0,
      tentativeCount: 0,
      totalGuestSeats: 0,
    },
  };
}

export async function submitGuestWish(payload: {
  guestName: string;
  relationship: string;
  attendanceStatus: AttendanceStatus;
  numberOfGuests: number;
  message: string;
  voiceUrl?: string | null;
}): Promise<GuestWish> {
  const res = await fetch(`${API_BASE}/public/guestbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Gagal mengirim ucapan');
  return data.data;
}

export async function submitWhatsappRSVP(payload: {
  guestName: string;
  attendanceStatus: AttendanceStatus;
  numberOfGuests: number;
  message: string;
}): Promise<{ whatsappUrl: string }> {
  const res = await fetch(`${API_BASE}/rsvp-whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Gagal membuat link WhatsApp');
  return { whatsappUrl: data.whatsappUrl };
}

// Guest 4-character Code Verification & Feature Unlock
export async function verifyGuestSlug(slug: string): Promise<GuestAccessVerification> {
  try {
    const res = await fetch(`${API_BASE}/public/guest/${encodeURIComponent(slug)}`);
    const json = await res.json();
    return {
      isValid: Boolean(json.isValid),
      guest: json.guest || null,
      message: json.message,
    };
  } catch (err: any) {
    return {
      isValid: false,
      guest: null,
      message: err.message || 'Gagal memverifikasi tautan tamu',
    };
  }
}

export async function verifyGuestCode(code: string): Promise<GuestAccessVerification> {
  try {
    const res = await fetch(`${API_BASE}/public/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const json = await res.json();
    return {
      isValid: Boolean(json.isValid),
      guest: json.guest || null,
      message: json.message,
    };
  } catch (err: any) {
    return {
      isValid: false,
      guest: null,
      message: err.message || 'Gagal memverifikasi kode akses',
    };
  }
}

// ==========================================
// AUTHENTICATION APIS
// ==========================================
export async function loginAdmin(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Login gagal. Periksa username dan password.');
  
  const authData: AuthResponse = {
    token: data.data.accessToken || data.data.token,
    accessToken: data.data.accessToken || data.data.token,
    refreshToken: data.data.refreshToken || '',
    expiresIn: data.data.expiresIn,
    user: data.data.user,
  };

  setAuthTokens(authData.accessToken, authData.refreshToken);
  return authData;
}

export async function fetchCurrentAdmin(): Promise<AdminUser> {
  return fetchWithAuth<AdminUser>(`${API_BASE}/auth/me`);
}

export async function logoutAdminApi(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
  } catch (err) {
    console.error('Logout request error:', err);
  } finally {
    clearAuthTokens();
  }
}

export async function changeAdminPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const res = await fetchWithAuth<{ message?: string } | any>(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { message: res?.message || 'Password berhasil diperbarui.' };
}

// ==========================================
// MODULAR CMS APIS (Protected, with auto-refresh)
// ==========================================

// Tab: /cms/overview
export async function fetchCMSStats(): Promise<CMSStatsData> {
  return fetchWithAuth<CMSStatsData>(`${API_BASE}/cms/stats`);
}

// Tab: /cms/mempelai
export async function fetchCMSCouple(): Promise<CMSCoupleData> {
  return fetchWithAuth<CMSCoupleData>(`${API_BASE}/cms/couple`);
}

export async function updateCMSCouple(payload: Partial<CMSCoupleData>): Promise<CMSCoupleData> {
  return fetchWithAuth<CMSCoupleData>(`${API_BASE}/cms/couple`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Tab: /cms/acara
export async function fetchCMSEvents(): Promise<WeddingEvent[]> {
  return fetchWithAuth<WeddingEvent[]>(`${API_BASE}/cms/events`);
}

export async function createCMSEvent(payload: Omit<WeddingEvent, 'id'>): Promise<WeddingEvent> {
  return fetchWithAuth<WeddingEvent>(`${API_BASE}/cms/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateCMSEvent(id: string, payload: Partial<WeddingEvent>): Promise<WeddingEvent> {
  return fetchWithAuth<WeddingEvent>(`${API_BASE}/cms/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCMSEvent(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/events/${id}`, {
    method: 'DELETE',
  });
}

// Tab: /cms/cerita
export async function fetchCMSStories(): Promise<LoveStoryItem[]> {
  return fetchWithAuth<LoveStoryItem[]>(`${API_BASE}/cms/stories`);
}

export async function createCMSStory(payload: Omit<LoveStoryItem, 'id'>): Promise<LoveStoryItem> {
  return fetchWithAuth<LoveStoryItem>(`${API_BASE}/cms/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateCMSStory(id: string, payload: Partial<LoveStoryItem>): Promise<LoveStoryItem> {
  return fetchWithAuth<LoveStoryItem>(`${API_BASE}/cms/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCMSStory(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/stories/${id}`, {
    method: 'DELETE',
  });
}

// Tab: /cms/galeri
export async function fetchCMSGallery(): Promise<GalleryPhoto[]> {
  return fetchWithAuth<GalleryPhoto[]>(`${API_BASE}/cms/gallery`);
}

export async function createCMSGalleryPhoto(payload: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  return fetchWithAuth<GalleryPhoto>(`${API_BASE}/cms/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createCMSBatchGalleryPhotos(photos: Omit<GalleryPhoto, 'id'>[]): Promise<GalleryPhoto[]> {
  return fetchWithAuth<GalleryPhoto[]>(`${API_BASE}/cms/gallery/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos }),
  });
}

export async function updateCMSGalleryPhoto(id: string, payload: Partial<GalleryPhoto>): Promise<GalleryPhoto> {
  return fetchWithAuth<GalleryPhoto>(`${API_BASE}/cms/gallery/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCMSGalleryPhoto(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/gallery/${id}`, {
    method: 'DELETE',
  });
}

// Tab: /cms/tamu
export async function fetchCMSGuests(status?: string, search?: string): Promise<{ data: GuestWish[]; stats: any }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const json = await fetchWithAuthRaw<any>(`${API_BASE}/cms/guests?${params.toString()}`);
  return {
    data: Array.isArray(json.data) ? json.data : [],
    stats: json.stats || {
      totalWishes: 0,
      attendingCount: 0,
      declinedCount: 0,
      tentativeCount: 0,
      totalGuestSeats: 0,
    },
  };
}

export async function replyToGuest(id: string, reply: string): Promise<GuestWish> {
  return fetchWithAuth<GuestWish>(`${API_BASE}/cms/guests/${id}/reply`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply }),
  });
}

export async function toggleGuestVisibility(id: string): Promise<GuestWish> {
  return fetchWithAuth<GuestWish>(`${API_BASE}/cms/guests/${id}/visibility`, {
    method: 'PUT',
  });
}

export async function deleteGuestWish(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/guests/${id}`, {
    method: 'DELETE',
  });
}

// Sub-Tab: /cms/tamu (Manajemen Daftar Tamu & Undangan Unik)
export async function fetchCMSInvitedGuests(filter?: string, search?: string): Promise<{ data: InvitedGuest[]; stats: PresensiStats }> {
  const params = new URLSearchParams();
  if (filter) params.append('filter', filter);
  if (search) params.append('search', search);

  const json = await fetchWithAuthRaw<any>(`${API_BASE}/cms/invited-guests?${params.toString()}`);
  return {
    data: Array.isArray(json.data) ? json.data : [],
    stats: json.stats || {
      totalInvited: 0,
      totalPaxAllocated: 0,
      totalCheckedIn: 0,
      totalActualPax: 0,
      totalRemaining: 0,
      totalSouvenirsGiven: 0,
    },
  };
}

export async function createCMSInvitedGuest(payload: {
  name: string;
  slug?: string;
  phone?: string;
  instagram?: string;
  category?: string;
  pax?: number;
  tableNumber?: string;
  customNote?: string;
  invitationSent?: boolean;
}): Promise<InvitedGuest> {
  return fetchWithAuth<InvitedGuest>(`${API_BASE}/cms/invited-guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createBatchCMSInvitedGuests(
  guests: Array<{
    name: string;
    category?: string;
    pax?: number;
    phone?: string;
    instagram?: string;
    tableNumber?: string;
    customNote?: string;
    invitationSent?: boolean;
  }>
): Promise<InvitedGuest[]> {
  return fetchWithAuth<InvitedGuest[]>(`${API_BASE}/cms/invited-guests/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guests }),
  });
}

export async function updateCMSInvitedGuest(id: string, payload: Partial<InvitedGuest>): Promise<InvitedGuest> {
  return fetchWithAuth<InvitedGuest>(`${API_BASE}/cms/invited-guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCMSInvitedGuest(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/invited-guests/${id}`, {
    method: 'DELETE',
  });
}

export async function batchUpdateCMSInvitationSent(
  ids: string[],
  sentStatus: boolean
): Promise<{ updatedCount: number }> {
  return fetchWithAuth<{ updatedCount: number }>(`${API_BASE}/cms/invited-guests/batch-sent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, sentStatus }),
  });
}

// Sub-Tab: /cms/tamu (Presensi Meja Penerima Tamu / Check-in)
export async function submitCMSPresensiCheckIn(payload: PresensiCheckInPayload): Promise<{
  guest: InvitedGuest;
  alreadyCheckedIn: boolean;
  message: string;
  stats: PresensiStats;
}> {
  return fetchWithAuthRaw<any>(`${API_BASE}/cms/presensi/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function undoCMSPresensiCheckIn(guestId: string): Promise<{
  guest: InvitedGuest;
  message: string;
  stats: PresensiStats;
}> {
  return fetchWithAuthRaw<any>(`${API_BASE}/cms/presensi/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestId }),
  });
}

export async function fetchCMSPresensiStats(): Promise<PresensiStats> {
  const res = await fetchWithAuth<{ data: PresensiStats } | any>(`${API_BASE}/cms/presensi/stats`);
  return res.data || res;
}

// Tab: /cms/kado
export async function fetchCMSGifts(): Promise<GiftAccount[]> {
  return fetchWithAuth<GiftAccount[]>(`${API_BASE}/cms/gifts`);
}

export async function createCMSGift(payload: Omit<GiftAccount, 'id'>): Promise<GiftAccount> {
  return fetchWithAuth<GiftAccount>(`${API_BASE}/cms/gifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateCMSGift(id: string, payload: Partial<GiftAccount>): Promise<GiftAccount> {
  return fetchWithAuth<GiftAccount>(`${API_BASE}/cms/gifts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteCMSGift(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE}/cms/gifts/${id}`, {
    method: 'DELETE',
  });
}

// Tab: /cms/tema
export async function fetchCMSTheme(): Promise<CMSThemeData> {
  return fetchWithAuth<CMSThemeData>(`${API_BASE}/cms/theme`);
}

export async function updateCMSTheme(payload: Partial<CMSThemeData>): Promise<CMSThemeData> {
  return fetchWithAuth<CMSThemeData>(`${API_BASE}/cms/theme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Tab: /cms/pengaturan
export async function fetchCMSGeneral(): Promise<CMSGeneralData> {
  return fetchWithAuth<CMSGeneralData>(`${API_BASE}/cms/general`);
}

export async function resetToDefaultData(): Promise<InvitationData> {
  return fetchWithAuth<InvitationData>(`${API_BASE}/admin/reset-default`, {
    method: 'POST',
  });
}

// Backward compatibility helper
export async function updateInvitationSettings(payload: Partial<InvitationData>): Promise<InvitationData> {
  return fetchWithAuth<InvitationData>(`${API_BASE}/admin/invitation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PHOTO MOMENTS APIS
// ==========================================
export async function fetchPhotoMoments(
  guestName?: string,
  guestSlug?: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  data: PhotoMoment[];
  userCount: number;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams();
  if (guestName) params.append('guestName', guestName);
  if (guestSlug) params.append('guestSlug', guestSlug);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());

  const queryStr = params.toString();
  const url = queryStr
    ? `${API_BASE}/public/photo-moments?${queryStr}`
    : `${API_BASE}/public/photo-moments`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Gagal memuat photo moments');
  return {
    data: json.data || [],
    userCount: json.userCount || 0,
    total: json.total || (json.data ? json.data.length : 0),
    page: json.page || page,
    limit: json.limit || limit,
    hasMore: Boolean(json.hasMore),
  };
}

export async function submitPhotoMoment(payload: {
  guestName: string;
  guestSlug?: string;
  photoUrl: string;
  caption?: string;
}): Promise<PhotoMoment> {
  const res = await fetch(`${API_BASE}/public/photo-moments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Gagal menyimpan foto moment');
  return json.photo;
}

export async function reactPhotoMomentApi(
  id: string,
  emoji: string = '❤️',
  action: 'add' | 'remove' = 'add'
): Promise<{ likesCount: number; reactions: Record<string, number> }> {
  const res = await fetch(`${API_BASE}/public/photo-moments/${id}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji, action }),
  });
  const json = await res.json();
  return {
    likesCount: json.likesCount || 0,
    reactions: json.reactions || {},
  };
}

export async function likePhotoMoment(id: string, action: 'add' | 'remove' = 'add'): Promise<number> {
  const res = await reactPhotoMomentApi(id, '❤️', action);
  return res.likesCount;
}

export async function deletePhotoMomentApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/public/photo-moments/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Gagal menghapus foto');
}

export async function fetchCMSPhotoMoments(): Promise<{
  data: PhotoMoment[];
  total: number;
}> {
  const json = await fetchWithAuthRaw<{ success: boolean; data: PhotoMoment[]; total: number }>(
    `${API_BASE}/cms/photo-moments`
  );
  return {
    data: json.data || [],
    total: json.total || (json.data ? json.data.length : 0),
  };
}

export async function deleteCMSPhotoMoment(id: string): Promise<boolean> {
  await fetchWithAuthRaw(`${API_BASE}/cms/photo-moments/${id}`, {
    method: 'DELETE',
  });
  return true;
}

export async function fetchPhotoFrameConfig(): Promise<PhotoFrameConfig> {
  const res = await fetch(`${API_BASE}/public/photo-moments/frame-config`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Gagal memuat konfigurasi frame');
  return json.data;
}

export async function fetchCMSPhotoFrameConfig(): Promise<PhotoFrameConfig> {
  return fetchWithAuth<PhotoFrameConfig>(`${API_BASE}/cms/photo-moments/frame-config`);
}

export async function updateCMSPhotoFrameConfig(
  payload: Partial<PhotoFrameConfig>
): Promise<PhotoFrameConfig> {
  return fetchWithAuth<PhotoFrameConfig>(`${API_BASE}/cms/photo-moments/frame-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ==========================================
// SERVER FILE STORAGE UPLOAD APIS
// ==========================================
export async function uploadFileToServer(
  file: File,
  category: 'hero' | 'gallery' | 'couples' | 'moments' | 'general' = 'general'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload?category=${category}`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!json.success || !json.url) {
    throw new Error(json.message || 'Gagal mengunggah file ke server storage.');
  }

  return json.url;
}

export async function uploadBatchFilesToServer(
  files: File[],
  category: 'hero' | 'gallery' | 'couples' | 'moments' | 'general' = 'general'
): Promise<Array<{ url: string; filename: string; originalName: string }>> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));

  const res = await fetch(`${API_BASE}/upload/batch?category=${category}`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!json.success || !json.files) {
    throw new Error(json.message || 'Gagal mengunggah batch file ke server storage.');
  }

  return json.files;
}

