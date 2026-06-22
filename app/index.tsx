import { Redirect } from 'expo-router';

import { AUTH_ROUTES } from '@/navigation/routes';

export default function Index() {
  return <Redirect href={AUTH_ROUTES.splash} />;
}
