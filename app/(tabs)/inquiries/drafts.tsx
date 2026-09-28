import { Redirect } from 'expo-router';

import { APP_ROUTES } from '@/navigation/routes';

/**
 * Drafts live under Requests → Drafts filter.
 * Keep this route as a redirect for old links / bookmarks.
 */
export default function DraftRequestsScreen() {
  return <Redirect href={APP_ROUTES.inquiryDrafts} />;
}
