export const AUTH_ROUTES = {
  splash: '/(auth)/splash',
  home: '/(auth)/home',
  signup: '/(auth)/signup',
  signupWizard: '/(auth)/signup-wizard',
  login: '/(auth)/login',
  welcome: '/(auth)/welcome',
} as const;

export type AuthRoute = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES];
