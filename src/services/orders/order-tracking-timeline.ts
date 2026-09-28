import type { CustomerOrder } from './customer-orders';
import type { TrackingEvent } from '@/types/ui';

function formatTimelineStamp(iso: string | null | undefined): string {
  if (!iso) return 'Pending';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function earliestIso(...values: Array<string | null | undefined>): string | null {
  const times = values
    .map((value) => {
      if (!value) return null;
      const ms = new Date(value).getTime();
      return Number.isNaN(ms) ? null : { value, ms };
    })
    .filter(Boolean) as Array<{ value: string; ms: number }>;
  if (times.length === 0) return null;
  times.sort((a, b) => a.ms - b.ms);
  return times[0].value;
}

/**
 * Build customer-facing order tracking events:
 * Request → Quotation received → Quotation accepted → Warehouse inward
 */
export function buildOrderTrackingTimeline(order: CustomerOrder): TrackingEvent[] {
  const requestAt = order.inquiryRequestedAt || order.createdAt;
  const quotationAt = order.quotationSentAt;
  const acceptedAt = order.acceptedAt;
  const warehouseAt = earliestIso(
    order.trackingAddedAt,
    order.parcelPhotoUploadedAt,
    order.shipmentInfoUpdatedAt,
  );

  const hasWarehouseInward = Boolean(
    order.trackingNumber || order.parcelPhotoUrl || warehouseAt,
  );

  const uploadedBySales = order.shipmentInfoUpdatedByRole === 'sales';
  const warehouseDetails: string[] = [];
  if (order.trackingNumber) {
    warehouseDetails.push(`Tracking ${order.trackingNumber}`);
  }
  if (order.parcelPhotoUrl) {
    warehouseDetails.push('Parcel photo on file');
  }
  const warehouseDescription = hasWarehouseInward
    ? [
        'Parcel received at warehouse and marked inward.',
        warehouseDetails.length ? warehouseDetails.join(' · ') : null,
        uploadedBySales
          ? 'Updated by your sales agent.'
          : order.shipmentInfoUpdatedByRole === 'customer'
            ? 'Updated from your shipment information.'
            : null,
      ]
        .filter(Boolean)
        .join(' ')
    : 'Waiting for tracking number or parcel photo. Once added, this means the parcel is received at the warehouse.';

  const steps: Array<{
    id: string;
    title: string;
    description: string;
    location?: string;
    at: string | null;
    done: boolean;
  }> = [
    {
      id: 'request',
      title: 'Request submitted',
      description: 'Your inquiry / freight request was sent to Logistix.',
      location: 'Customer app',
      at: requestAt,
      done: Boolean(requestAt),
    },
    {
      id: 'quotation',
      title: 'Quotation received',
      description: order.quotationNumber
        ? `Quotation ${order.quotationNumber} was shared with you.`
        : 'Your quotation was shared with you.',
      location: 'Sales',
      at: quotationAt,
      done: Boolean(quotationAt),
    },
    {
      id: 'accepted',
      title: 'Quotation accepted',
      description: 'You accepted the quotation and the order was created.',
      location: 'Customer app',
      at: acceptedAt,
      done: Boolean(acceptedAt),
    },
    {
      id: 'warehouse',
      title: 'Received at warehouse',
      description: warehouseDescription,
      location: 'Warehouse · Inward',
      at: hasWarehouseInward ? warehouseAt || acceptedAt : null,
      done: hasWarehouseInward,
    },
  ];

  const firstPendingIndex = steps.findIndex((step) => !step.done);

  return steps.map((step, index) => {
    const active =
      firstPendingIndex === -1
        ? index === steps.length - 1
        : index === firstPendingIndex;

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      location: step.location,
      timestamp: step.done ? formatTimelineStamp(step.at) : 'Pending',
      completed: step.done,
      active,
    };
  });
}
