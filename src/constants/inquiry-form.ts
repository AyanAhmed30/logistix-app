export const INQUIRY_WIZARD_STEPS = ['Product', 'Cargo', 'Notes', 'Review'] as const;

export const INQUIRY_WIZARD_STEP_COUNT = INQUIRY_WIZARD_STEPS.length;

export function clampInquiryWizardStep(step: number | null | undefined): number {
  const raw = Number(step);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(INQUIRY_WIZARD_STEP_COUNT - 1, Math.max(0, Math.floor(raw)));
}

export function inquiryWizardStepLabel(step: number | null | undefined): string {
  const index = clampInquiryWizardStep(step);
  return `Step ${index + 1} of ${INQUIRY_WIZARD_STEP_COUNT}`;
}
