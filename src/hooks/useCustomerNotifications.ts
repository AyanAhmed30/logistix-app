import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/providers';
import {
  getCustomerUnreadNotificationCount,
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from '@/services/notifications/customer-notifications';

export const CUSTOMER_NOTIFICATIONS_QUERY_KEY = 'customer-notifications';
export const CUSTOMER_UNREAD_COUNT_QUERY_KEY = 'customer-notifications-unread';

/** Live notifications list — polls so updates appear without a manual refresh. */
export function useCustomerNotifications() {
  const { sessionToken } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CUSTOMER_NOTIFICATIONS_QUERY_KEY, sessionToken],
    enabled: Boolean(sessionToken),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    queryFn: async () => {
      const result = await listCustomerNotifications(sessionToken!);
      if (result.error) throw result.error;
      return result.data;
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!sessionToken) return;
      void query.refetch();
      void queryClient.invalidateQueries({
        queryKey: [CUSTOMER_UNREAD_COUNT_QUERY_KEY, sessionToken],
      });
    }, [query.refetch, queryClient, sessionToken]),
  );

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markCustomerNotificationRead(sessionToken!, notificationId);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [CUSTOMER_NOTIFICATIONS_QUERY_KEY, sessionToken],
      });
      await queryClient.invalidateQueries({
        queryKey: [CUSTOMER_UNREAD_COUNT_QUERY_KEY, sessionToken],
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const result = await markAllCustomerNotificationsRead(sessionToken!);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [CUSTOMER_NOTIFICATIONS_QUERY_KEY, sessionToken],
      });
      await queryClient.invalidateQueries({
        queryKey: [CUSTOMER_UNREAD_COUNT_QUERY_KEY, sessionToken],
      });
    },
  });

  return {
    ...query,
    markRead,
    markAllRead,
  };
}

export function useCustomerUnreadNotificationCount() {
  const { sessionToken } = useAuth();

  return useQuery({
    queryKey: [CUSTOMER_UNREAD_COUNT_QUERY_KEY, sessionToken],
    enabled: Boolean(sessionToken),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    queryFn: async () => {
      const result = await getCustomerUnreadNotificationCount(sessionToken!);
      // Soft-fail (e.g. migration not applied yet) so the bell still works.
      if (result.error) return 0;
      return result.data;
    },
  });
}
