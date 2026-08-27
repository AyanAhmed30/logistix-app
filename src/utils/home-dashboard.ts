import {
  CustomerStatus,
  getCustomerStatusConfig,
  mapInternalToCustomerStatus,
} from '@/constants/customer-status';
import { MockActionItem } from '@/types/customer';
import { CustomerInquiry } from '@/types/inquiry';

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
  return inquiries.filter((inquiry) => isActiveCustomerStatus(getInquiryCustomerStatus(inquiry)));
}
