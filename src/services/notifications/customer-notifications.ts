import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import type { CustomerNotification } from '@/types/notifications';

function mapRpcError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }
  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();
  if (
    message.includes('invalid_session') ||
    message.includes('unauthorized') ||
    message.includes('permission denied')
  ) {
    return new Error('unauthorized_notification_access');
  }
  if (message.includes('does not exist')) {
    return new Error(
      'notification_schema_missing: Run supabase/migrations/041_customer_app_notifications.sql in Supabase.',
    );
  }
  return new Error(pgError.message || 'Unable to load notifications.');
}

function mapRow(row: Record<string, unknown>): CustomerNotification {
  return {
    id: String(row.id || ''),
    eventType: String(row.event_type || 'info'),
    title: String(row.title || 'Update'),
    message: String(row.message || ''),
    href: String(row.href || '/(tabs)'),
    isRead: Boolean(row.is_read),
    inquiryId: row.inquiry_id ? String(row.inquiry_id) : null,
    quotationId: row.quotation_id ? String(row.quotation_id) : null,
    leadId: row.lead_id ? String(row.lead_id) : null,
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function listCustomerNotifications(
  sessionToken: string,
  limit = 50,
): Promise<{ data: CustomerNotification[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: [],
        error: new Error('Supabase is not configured.'),
      };
    }
    if (!sessionToken.trim()) {
      return { data: [], error: new Error('unauthorized_notification_access') };
    }

    const { data, error } = await getSupabase().rpc('list_customer_notifications', {
      p_session_token: sessionToken,
      p_limit: limit,
    });

    if (error) {
      return { data: [], error: mapRpcError(error) };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      data: rows.map((row) => mapRow((row || {}) as Record<string, unknown>)),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unable to load notifications.'),
    };
  }
}

export async function getCustomerUnreadNotificationCount(
  sessionToken: string,
): Promise<{ data: number; error: Error | null }> {
  try {
    if (!isSupabaseConfigured() || !sessionToken.trim()) {
      return { data: 0, error: null };
    }

    const { data, error } = await getSupabase().rpc(
      'get_customer_unread_notification_count',
      { p_session_token: sessionToken },
    );

    if (error) {
      return { data: 0, error: mapRpcError(error) };
    }

    return { data: Number(data) || 0, error: null };
  } catch (error) {
    return {
      data: 0,
      error: error instanceof Error ? error : new Error('Unable to load unread count.'),
    };
  }
}

export async function markCustomerNotificationRead(
  sessionToken: string,
  notificationId: string,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await getSupabase().rpc('mark_customer_notification_read', {
      p_session_token: sessionToken,
      p_notification_id: notificationId,
    });
    if (error) return { error: mapRpcError(error) };
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unable to update notification.'),
    };
  }
}

export async function markAllCustomerNotificationsRead(
  sessionToken: string,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await getSupabase().rpc('mark_all_customer_notifications_read', {
      p_session_token: sessionToken,
    });
    if (error) return { error: mapRpcError(error) };
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unable to update notifications.'),
    };
  }
}
