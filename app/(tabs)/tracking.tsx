import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';

export default function TrackingScreen() {
  return (
    <ScreenContainer title="Tracking" subtitle="Live shipment milestones" showNotificationBell>
      <FadeIn>
        <EmptyState
          icon="navigate-outline"
          title="Coming soon"
          description="Live warehouse and transit tracking will appear here. For now, check Orders for shipment status and details."
        />
      </FadeIn>
    </ScreenContainer>
  );
}
