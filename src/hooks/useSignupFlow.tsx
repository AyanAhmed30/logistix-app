import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { SignupFlowState } from '@/types/auth';

type SignupFlowContextValue = {
  phone: string;
  setPhone: (phone: string) => void;
  resetSignupFlow: () => void;
};

const SignupFlowContext = createContext<SignupFlowContextValue | null>(null);

const initialState: SignupFlowState = {
  phone: '',
};

type SignupFlowProviderProps = {
  children: ReactNode;
};

export function SignupFlowProvider({ children }: SignupFlowProviderProps) {
  const [state, setState] = useState<SignupFlowState>(initialState);

  const setPhone = useCallback((phone: string) => {
    setState({ phone });
  }, []);

  const resetSignupFlow = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo(
    () => ({
      phone: state.phone,
      setPhone,
      resetSignupFlow,
    }),
    [resetSignupFlow, setPhone, state.phone],
  );

  return <SignupFlowContext.Provider value={value}>{children}</SignupFlowContext.Provider>;
}

export function useSignupFlow() {
  const context = useContext(SignupFlowContext);

  if (!context) {
    throw new Error('useSignupFlow must be used within SignupFlowProvider');
  }

  return context;
}
