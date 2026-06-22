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
  loggedInAt: string;
};
