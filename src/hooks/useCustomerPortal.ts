import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { fetchCustomerPortalByUserId } from '@/services/inquiries';
import { CustomerPortalData } from '@/types/inquiry';

const EMPTY_PORTAL: CustomerPortalData = { leads: [], inquiries: [] };

export function useCustomerPortal(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['customer-portal', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return EMPTY_PORTAL;
      }

      const result = await fetchCustomerPortalByUserId(userId);

      if (result.error) {
        throw result.error;
      }

      return result.data ?? EMPTY_PORTAL;
    },
    staleTime: 30_000,
  });

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        void query.refetch();
      }
    }, [query.refetch, userId]),
  );

  return query;
}
