/** FAQ copy for Profile → Support. Contact channels use the assigned Sales Agent RPC. */
export const SUPPORT_FAQ = [
  {
    id: 'status',
    question: 'How do request statuses work?',
    answer:
      'Submitted means we received your details. Under review means Logistix is processing. Quote ready means you can review pricing. Completed means the request is finished.',
  },
  {
    id: 'phone',
    question: 'Why don’t I see my requests?',
    answer:
      'Requests are linked by the phone number on your account. Ask your sales agent to confirm the lead phone matches your app phone (including country code).',
  },
  {
    id: 'track',
    question: 'How do I track cargo?',
    answer:
      'Open Tracking or an order detail to see warehouse milestones such as received, dispatched, and completed.',
  },
] as const;
