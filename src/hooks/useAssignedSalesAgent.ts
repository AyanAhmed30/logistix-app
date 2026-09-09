import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { fetchAssignedSalesAgent, type AssignedSalesAgent } from '@/services/support';

export function useAssignedSalesAgent(sessionToken: string | undefined | null) {
  const query = useQuery({
    queryKey: ['assigned-sales-agent', sessionToken],
    enabled: Boolean(sessionToken),
    queryFn: async (): Promise<AssignedSalesAgent | null> => {
      if (!sessionToken) {
        return null;
      }

      const result = await fetchAssignedSalesAgent(sessionToken);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 15_000,
    refetchOnMount: 'always',
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
