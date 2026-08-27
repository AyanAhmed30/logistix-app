export type AppUser = {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

export type SignupFlowState = {
  phone: string;
};

export type AppSession = {
  user: AppUser;
  /** Opaque server session token — required for portal and authenticated RPCs. */
  sessionToken: string;
  expiresAt: string;
  loggedInAt: string;
};

export type AuthSessionPayload = {
  user: AppUser;
  sessionToken: string;
  expiresAt: string;
};
