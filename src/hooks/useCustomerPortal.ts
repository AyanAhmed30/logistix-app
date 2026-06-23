import { useQuery } from '@tanstack/react-query';

import { fetchCustomerPortalByPhone } from '@/services/inquiries';
import { CustomerPortalData } from '@/types/inquiry';

const EMPTY_PORTAL: CustomerPortalData = { leads: [], inquiries: [] };

export function useCustomerPortal(phone: string | undefined) {
  return useQuery({
    queryKey: ['customer-portal', phone],
    enabled: Boolean(phone),
    queryFn: async () => {
      if (!phone) {
        return EMPTY_PORTAL;
      }

      const result = await fetchCustomerPortalByPhone(phone);

      if (result.error) {
        throw result.error;
      }

      return result.data ?? EMPTY_PORTAL;
    },
    staleTime: 60_000,
  });
}
