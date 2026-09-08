import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export type AssignedSalesAgent = {
  id: string;
  name: string;
  phone: string | null;
};

export type AssignedSalesAgentResult = {
  data: AssignedSalesAgent | null;
  error: Error | null;
};

type RpcPayload = {
  agent?: {
    id?: string;
    name?: string;
    phone?: string | null;
  } | null;
};

function mapError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }

  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();

  if (message.includes('invalid_session') || message.includes('unauthorized_user')) {
    return new Error('invalid_session');
  }

  if (
    message.includes('get_customer_assigned_sales_agent') &&
    (message.includes('does not exist') || message.includes('could not find'))
  ) {
    return new Error(
      'assigned_agent_schema_missing: Run supabase/migrations/022_get_customer_assigned_sales_agent.sql in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to load your Sales Agent.');
}

function parseAgent(data: unknown): AssignedSalesAgent | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as RpcPayload;
  const agent = payload.agent;
  if (!agent || typeof agent !== 'object' || !agent.id || !agent.name) {
    return null;
  }

  const phone =
    typeof agent.phone === 'string' && agent.phone.trim().length > 0
      ? agent.phone.trim()
      : null;

  return {
    id: String(agent.id),
    name: String(agent.name).trim() || 'Sales Agent',
    phone,
  };
}

export async function fetchAssignedSalesAgent(
  sessionToken: string,
): Promise<AssignedSalesAgentResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (!sessionToken.trim() || sessionToken.trim().length < 32) {
      return { data: null, error: new Error('invalid_session') };
    }

    const { data, error } = await getSupabase().rpc('get_customer_assigned_sales_agent', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null, error: mapError(error) };
    }

    return { data: parseAgent(data), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load your Sales Agent.'),
    };
  }
}
