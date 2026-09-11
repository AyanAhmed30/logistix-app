import {
  CustomerStatus,
  getCustomerStatusConfig,
  mapInternalToCustomerStatus,
} from '@/constants/customer-status';
import { MockActionItem } from '@/types/customer';
import { CustomerInquiry } from '@/types/inquiry';

export function isDraftInquiry(
  inquiry: Pick<CustomerInquiry, 'status' | 'isDraft' | 'customerSubmitted'>,
): boolean {
  if (inquiry.isDraft) return true;
  return String(inquiry.status || '').toLowerCase() === 'draft' && !inquiry.customerSubmitted;
}

export function getInquiryCustomerStatus(inquiry: CustomerInquiry): CustomerStatus {
  return mapInternalToCustomerStatus({
    status: inquiry.status,
    sentAt: inquiry.sentAt,
    approvalStatus: inquiry.approvalStatus,
    customerSubmitted: inquiry.customerSubmitted,
    hasQuote: inquiry.hasQuote,
  });
}

export function isActiveCustomerStatus(status: CustomerStatus): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

export function requiresCustomerAction(status: CustomerStatus): boolean {
  return status === 'quote_ready' || status === 'action_needed';
}

/** Derive Home “Things you need to do” from live portal inquiries. */
export function deriveHomeActions(inquiries: CustomerInquiry[]): MockActionItem[] {
  const actions: MockActionItem[] = [];

  for (const inquiry of inquiries) {
    if (isDraftInquiry(inquiry)) {
      const product = inquiry.productName?.trim() || 'Untitled draft';
      actions.push({
        id: `draft-${inquiry.id}`,
        title: 'Continue draft',
        subtitle: product,
        type: 'info',
        requestId: inquiry.id,
        ctaLabel: 'Continue',
      });
      continue;
    }

    const status = getInquiryCustomerStatus(inquiry);
    if (!requiresCustomerAction(status)) continue;

    const product = inquiry.productName?.trim() || 'Freight request';
    const config = getCustomerStatusConfig(status);

    if (status === 'quote_ready') {
      actions.push({
        id: `quote-${inquiry.id}`,
        title: 'Quote ready',
        subtitle: `${product} · ${inquiry.inquiryNumber}`,
        type: 'quote',
        requestId: inquiry.id,
        ctaLabel: 'Review',
      });
      continue;
    }

    actions.push({
      id: `action-${inquiry.id}`,
      title: config.label,
      subtitle: `${product} · ${inquiry.inquiryNumber}`,
      type: 'info',
      requestId: inquiry.id,
      ctaLabel: 'Open',
    });
  }

  return actions;
}

export function getActivePortalInquiries(inquiries: CustomerInquiry[]): CustomerInquiry[] {
  return inquiries.filter(
    (inquiry) =>
      !isDraftInquiry(inquiry) && isActiveCustomerStatus(getInquiryCustomerStatus(inquiry)),
  );
}

export function getDraftInquiries(inquiries: CustomerInquiry[]): CustomerInquiry[] {
  return inquiries
    .filter(isDraftInquiry)
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return bTime - aTime;
    });
}

export function formatDraftUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startThat) / 86_400_000);
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
