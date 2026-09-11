export const AUTH_ROUTES = {
  splash: '/(auth)/splash',
  home: '/(auth)/home',
  signup: '/(auth)/signup',
  signupWizard: '/(auth)/signup-wizard',
  login: '/(auth)/login',
  welcome: '/(auth)/welcome',
  forgotPassword: '/(auth)/forgot-password',
} as const;

export const APP_ROUTES = {
  tabs: '/(tabs)',
  home: '/(tabs)',
  inquiries: '/(tabs)/inquiries',
  inquiryDrafts: '/(tabs)/inquiries/drafts',
  inquiryNew: '/(tabs)/inquiries/new?mode=new',
  inquiryDraft: (id: string) =>
    `/(tabs)/inquiries/new?mode=edit&draftId=${encodeURIComponent(id)}` as const,
  inquiryDetail: (id: string) => `/(tabs)/inquiries/${id}` as const,
  inquiryQuote: (id: string) => `/(tabs)/inquiries/${id}/quote` as const,
  orders: '/(tabs)/orders',
  orderDetail: (id: string) => `/(tabs)/orders/${id}` as const,
  tracking: '/(tabs)/tracking',
  profile: '/(tabs)/profile',
  profileEdit: '/(tabs)/profile/edit',
  profileSecurity: '/(tabs)/profile/security',
  notifications: '/(tabs)/profile/notifications',
  support: '/(tabs)/profile/support',
} as const;

export type AuthRoute = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES];

/** Always opens a blank request form (unique query so Expo Router cannot reuse a filled instance). */
export function newRequestHref() {
  return `/(tabs)/inquiries/new?mode=new&t=${Date.now()}` as const;
}
