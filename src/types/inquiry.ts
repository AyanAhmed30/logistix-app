export type CustomerLead = {
  id: string;
  name: string;
  leadNumber: string | null;
  status: string;
  createdAt: string;
};

export type CustomerInquiry = {
  id: string;
  leadId: string;
  leadNumber: string | null;
  inquiryNumber: string;
  productName: string | null;
  description: string | null;
  quantity: string | null;
  totalWeight: string | null;
  cbm: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  additionalImageUrls: string[];
  status: string;
  createdAt: string;
  sentAt: string | null;
  updatedAt: string | null;
  shippingMark: string | null;
  origin: string | null;
  destination: string | null;
};

export type CustomerPortalData = {
  leads: CustomerLead[];
  inquiries: CustomerInquiry[];
};
