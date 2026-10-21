import type {
  AdminUser,
  AttendanceStatus,
  AuthResponse,
  CameraConfig,
  CameraSettings,
  CMSGeneralData,
  CMSStatsData,
  CoupleProfile,
  GalleryPhoto,
  GiftAccount,
  GuestAccessVerification,
  GuestWish,
  InvitationData,
  InvitedGuest,
  InvitedGuestInput,
  LoveStoryItem,
  PhotoComment,
  PhotoFrameConfig,
  PhotoMoment,
  PresensiCheckInPayload,
  PresensiStats,
  RSVPStats,
  ThemeSettings,
  UploadCategory,
  WeddingEvent,
} from '@shared/types';

const API = '/api';
const TOKEN_KEY = 'wedding_admin_token';
const REFRESH_KEY = 'wedding_admin_refresh_token';

export const AUTH_TOKEN_STORAGE_KEY = TOKEN_KEY;
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

// --- Token storage ---

function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const getAccessToken = () => storageGet(TOKEN_KEY);
export const getRefreshToken = () => storageGet(REFRESH_KEY);

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // Private mode: the session lasts for this tab only.
  }
}

export function clearAuthTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Nothing stored.
  }
}

// --- Transport ---

type Json = Record<string, any>;

export class ApiError extends Error {}

async function parse(res: Response): Promise<Json> {
  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Permintaan gagal (${res.status}).`);
  }
  return json;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** Unauthenticated request; resolves to the whole JSON body. */
async function publicRequest(path: string, init?: RequestInit): Promise<Json> {
  return parse(await fetch(API + path, init));
}

// One refresh in flight at a time, shared by every request that hit a 401.
let refreshing: Promise<string | null> | null = null;

export function refreshAuthToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);
  refreshing ??= (async () => {
    try {
      const json = await publicRequest('/auth/refresh', jsonInit('POST', { refreshToken }));
      const { accessToken, refreshToken: next } = json.data as AuthResponse;
      setAuthTokens(accessToken, next);
      return accessToken;
    } catch {
      clearAuthTokens();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function withToken(init: RequestInit = {}, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/** Admin request; refreshes the token once on 401 and replays. Resolves to the whole JSON body. */
async function adminRequest(path: string, init?: RequestInit): Promise<Json> {
  let res = await fetch(API + path, withToken(init, getAccessToken()));
  if (res.status === 401) {
    const token = await refreshAuthToken();
    if (!token) throw new ApiError('Sesi berakhir. Silakan masuk lagi.');
    res = await fetch(API + path, withToken(init, token));
  }
  return parse(res);
}

const adminData = async <T>(path: string, init?: RequestInit) => (await adminRequest(path, init)).data as T;

/** list/create/update/remove for one CMS collection. */
function collection<T extends { id: string }>(path: string) {
  return {
    list: () => adminData<T[]>(path),
    create: (input: Omit<T, 'id'>) => adminData<T>(path, jsonInit('POST', input)),
    update: (id: string, patch: Partial<T>) => adminData<T>(`${path}/${id}`, jsonInit('PUT', patch)),
    remove: async (id: string) => {
      await adminRequest(`${path}/${id}`, { method: 'DELETE' });
    },
  };
}

const query = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : '';
};

// --- Public API (guests) ---

export const publicApi = {
  invitation: async () => (await publicRequest('/invitation')).data as InvitationData,

  guestbook: async (): Promise<{ data: GuestWish[]; stats: RSVPStats }> => {
    const json = await publicRequest('/public/guestbook');
    return { data: json.data || [], stats: json.stats };
  },

  submitWish: async (input: {
    guestName: string;
    relationship: string;
    attendanceStatus: AttendanceStatus;
    numberOfGuests: number;
    message: string;
    voiceUrl?: string | null;
  }) => (await publicRequest('/public/guestbook', jsonInit('POST', input))).data as GuestWish,

  /** Never throws: a network failure reads as "not verified". */
  verifyCode: async (code: string): Promise<GuestAccessVerification> => {
    try {
      const json = await publicRequest('/public/verify-access', jsonInit('POST', { code: code.trim().toUpperCase() }));
      return { isValid: Boolean(json.isValid), guest: json.guest || null, message: json.message };
    } catch (err) {
      return { isValid: false, guest: null, message: (err as Error).message };
    }
  },

  photoMoments: async (params: { guestName?: string; guestSlug?: string; page: number; limit: number }) => {
    const json = await publicRequest(`/public/photo-moments${query(params)}`);
    return {
      data: (json.data || []) as PhotoMoment[],
      userCount: Number(json.userCount) || 0,
      total: Number(json.total) || 0,
      hasMore: Boolean(json.hasMore),
    };
  },

  reactPhotoMoment: async (id: string, emoji: string, action: 'add' | 'remove') => {
    const json = await publicRequest(`/public/photo-moments/${id}/react`, jsonInit('POST', { emoji, action }));
    return { likesCount: Number(json.likesCount) || 0, reactions: (json.reactions || {}) as Record<string, number> };
  },

  frameConfig: async () => (await publicRequest('/public/photo-moments/frame-config')).data as PhotoFrameConfig,

  cameraConfig: async () => (await publicRequest('/public/photo-moments/config')).data as CameraConfig,

  photoComments: async (id: string) => (await publicRequest(`/public/photo-moments/${id}/comments`)).data as PhotoComment[],

  addPhotoComment: async (id: string, input: { guestName: string; guestSlug?: string; text: string }) =>
    (await publicRequest(`/public/photo-moments/${id}/comments`, jsonInit('POST', input))).data as PhotoComment,

  screen: async () => {
    const json = await publicRequest('/public/photo-moments/screen');
    return { data: (json.data || []) as PhotoMoment[], total: Number(json.total) || 0 };
  },
};

// --- Auth ---

export const authApi = {
  login: async (username: string, password: string) => {
    const auth = (await publicRequest('/auth/login', jsonInit('POST', { username, password }))).data as AuthResponse;
    setAuthTokens(auth.accessToken, auth.refreshToken);
    return auth;
  },
  me: () => adminData<AdminUser>('/auth/me'),
  logout: async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST' }).catch(() => undefined);
    clearAuthTokens();
  },
  changePassword: async (currentPassword: string, newPassword: string) =>
    (await adminRequest('/auth/change-password', jsonInit('POST', { currentPassword, newPassword }))).message as string,
};

// --- CMS API (admin) ---

export const cmsApi = {
  stats: () => adminData<CMSStatsData>('/cms/stats'),
  general: () => adminData<CMSGeneralData>('/cms/general'),
  resetDemo: () => adminData<InvitationData>('/admin/reset-default', { method: 'POST' }),

  couple: {
    get: () => adminData<CoupleProfile>('/cms/couple'),
    save: (input: Partial<CoupleProfile>) => adminData<CoupleProfile>('/cms/couple', jsonInit('PUT', input)),
  },
  theme: {
    get: () => adminData<ThemeSettings>('/cms/theme'),
    save: (input: Partial<ThemeSettings>) => adminData<ThemeSettings>('/cms/theme', jsonInit('PUT', input)),
  },

  events: collection<WeddingEvent>('/cms/events'),
  stories: collection<LoveStoryItem>('/cms/stories'),
  gifts: collection<GiftAccount>('/cms/gifts'),
  gallery: {
    ...collection<GalleryPhoto>('/cms/gallery'),
    createMany: (photos: Omit<GalleryPhoto, 'id'>[]) => adminData<GalleryPhoto[]>('/cms/gallery/batch', jsonInit('POST', { photos })),
  },

  wishes: {
    list: async (status: string, search: string): Promise<{ data: GuestWish[]; stats: RSVPStats }> => {
      const json = await adminRequest(`/cms/guests${query({ status, search })}`);
      return { data: json.data || [], stats: json.stats };
    },
    reply: (id: string, reply: string) => adminData<GuestWish>(`/cms/guests/${id}/reply`, jsonInit('PUT', { reply })),
    toggleVisibility: (id: string) => adminData<GuestWish>(`/cms/guests/${id}/visibility`, { method: 'PUT' }),
    remove: async (id: string) => {
      await adminRequest(`/cms/guests/${id}`, { method: 'DELETE' });
    },
  },

  invitedGuests: {
    list: async (filter = 'ALL', search = ''): Promise<{ data: InvitedGuest[]; stats: PresensiStats }> => {
      const json = await adminRequest(`/cms/invited-guests${query({ filter, search })}`);
      return { data: json.data || [], stats: json.stats };
    },
    create: (input: InvitedGuestInput) => adminData<InvitedGuest>('/cms/invited-guests', jsonInit('POST', input)),
    createMany: (guests: InvitedGuestInput[]) => adminData<InvitedGuest[]>('/cms/invited-guests/batch', jsonInit('POST', { guests })),
    update: (id: string, patch: Partial<InvitedGuest>) => adminData<InvitedGuest>(`/cms/invited-guests/${id}`, jsonInit('PUT', patch)),
    remove: async (id: string) => {
      await adminRequest(`/cms/invited-guests/${id}`, { method: 'DELETE' });
    },
    markSent: (ids: string[], sentStatus: boolean) =>
      adminData<{ updatedCount: number }>('/cms/invited-guests/batch-sent', jsonInit('POST', { ids, sentStatus })),
    checkIn: async (input: PresensiCheckInPayload) => {
      const json = await adminRequest('/cms/presensi/check-in', jsonInit('POST', input));
      return json as unknown as { guest: InvitedGuest; alreadyCheckedIn: boolean; message: string; stats: PresensiStats };
    },
    undoCheckIn: async (guestId: string) => {
      const json = await adminRequest('/cms/presensi/undo', jsonInit('POST', { guestId }));
      return json as unknown as { guest: InvitedGuest; message: string; stats: PresensiStats };
    },
  },

  photoMoments: {
    list: () => adminData<PhotoMoment[]>('/cms/photo-moments'),
    remove: async (id: string) => {
      await adminRequest(`/cms/photo-moments/${id}`, { method: 'DELETE' });
    },
    frame: () => adminData<PhotoFrameConfig>('/cms/photo-moments/frame-config'),
    saveFrame: (input: Partial<PhotoFrameConfig>) => adminData<PhotoFrameConfig>('/cms/photo-moments/frame-config', jsonInit('PUT', input)),
    settings: () => adminData<CameraSettings>('/cms/photo-moments/settings'),
    saveSettings: (input: Partial<CameraSettings>) => adminData<CameraSettings>('/cms/photo-moments/settings', jsonInit('PUT', input)),
    approve: (id: string, approved: boolean) => adminData<PhotoMoment>(`/cms/photo-moments/${id}/approval`, jsonInit('PUT', { approved })),
    removeComment: async (id: string) => {
      await adminRequest(`/cms/photo-moments/comments/${id}`, { method: 'DELETE' });
    },
  },
};

// --- File uploads ---

/** Uploads one file. Guests may only use the "moments" category; anything else sends the admin token. */
export async function uploadFile(file: File, category: UploadCategory): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const path = `/upload${query({ category })}`;
  const json =
    category === 'moments' ? await publicRequest(path, { method: 'POST', body }) : await adminRequest(path, { method: 'POST', body });
  return json.url as string;
}

export async function uploadFiles(files: File[], category: UploadCategory) {
  const body = new FormData();
  files.forEach((f) => body.append('files', f));
  const json = await adminRequest(`/upload/batch${query({ category })}`, { method: 'POST', body });
  return json.files as Array<{ url: string; originalName: string; mimetype: string; size: number }>;
}
