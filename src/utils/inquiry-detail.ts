import { mapInternalToCustomerStatus } from '@/constants/customer-status';
import { CustomerInquiry } from '@/types/inquiry';
import { TrackingEvent } from '@/types/ui';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleString();
}

/**
 * Customer-safe timeline from portal inquiry fields only
 * (created_at, sent_at, status). No invented warehouse events.
 */
export function buildInquiryTimeline(inquiry: CustomerInquiry): TrackingEvent[] {
  const status = mapInternalToCustomerStatus({
    status: inquiry.status,
    sentAt: inquiry.sentAt,
    approvalStatus: inquiry.approvalStatus,
    customerSubmitted: inquiry.customerSubmitted,
    hasQuote: inquiry.hasQuote,
  });
  const visual = getCustomerStatusVisual(status);
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  const events: TrackingEvent[] = [];

  events.push({
    id: 'created',
    title: inquiry.customerSubmitted ? 'Submitted by you' : 'Request created',
    description: inquiry.customerSubmitted
      ? 'Your request was sent to your Logistix sales agent for review.'
      : 'Logistix recorded your freight details.',
    timestamp: formatWhen(inquiry.createdAt) || '—',
    completed: true,
    active: false,
  });

  if (inquiry.sentAt) {
    events.push({
      id: 'sent',
      title: 'Sent for processing',
      description: 'Your request was sent to Logistix operations.',
      timestamp: formatWhen(inquiry.sentAt),
      completed: true,
      active: false,
    });
  }

  if (status === 'quote_ready') {
    events.push({
      id: 'quote',
      title: 'Quote ready',
      description: visual.explanation,
      timestamp: formatWhen(inquiry.updatedAt) || formatWhen(inquiry.sentAt) || '—',
      completed: false,
      active: true,
    });
  } else if (isCompleted) {
    events.push({
      id: 'completed',
      title: 'Completed',
      description: visual.explanation,
      timestamp: formatWhen(inquiry.updatedAt) || '—',
      completed: true,
      active: false,
    });
  } else if (isCancelled) {
    events.push({
      id: 'cancelled',
      title: 'Cancelled',
      description: visual.explanation,
      timestamp: formatWhen(inquiry.updatedAt) || '—',
      completed: true,
      active: false,
    });
  } else {
    events.push({
      id: 'current',
      title: visual.label,
      description: visual.nextStep,
      timestamp: formatWhen(inquiry.updatedAt) || formatWhen(inquiry.sentAt) || '—',
      completed: false,
      active: true,
    });
  }

  // Timeline UI expects newest-first in mock; keep chronological oldest → newest
  // so the line reads as a progress story (created → sent → current).
  return events;
}

export function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}
