import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { fetchCustomerPortalBySession } from '@/services/inquiries';
import { CustomerPortalData } from '@/types/inquiry';

const EMPTY_PORTAL: CustomerPortalData = { leads: [], inquiries: [] };

export function useCustomerPortal(sessionToken: string | undefined | null) {
  const query = useQuery({
    queryKey: ['customer-portal', sessionToken],
    enabled: Boolean(sessionToken),
    queryFn: async () => {
      if (!sessionToken) {
        return EMPTY_PORTAL;
      }

      const result = await fetchCustomerPortalBySession(sessionToken);

      if (result.error) {
        throw result.error;
      }

      return result.data ?? EMPTY_PORTAL;
    },
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      if (sessionToken) {
        void query.refetch();
      }
    }, [query.refetch, sessionToken]),
  );

  return query;
}
