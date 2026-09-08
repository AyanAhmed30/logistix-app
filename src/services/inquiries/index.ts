export {
  fetchCustomerPortalBySession,
  type CustomerPortalResult,
} from './customer-portal';
export {
  submitCustomerInquiry,
  type SubmitCustomerInquiryInput,
  type SubmitCustomerInquiryResult,
} from './submit';
export {
  MAX_CUSTOMER_ATTACHMENTS,
  uploadCustomerInquiryAttachments,
  splitUploadedAttachments,
  isImageAttachment,
  type LocalAttachment,
} from './attachments';
export {
  fetchCustomerQuoteBySession,
  submitQuotationNegotiation,
  acceptCustomerQuotation,
  declineCustomerQuotation,
  type CustomerQuote,
  type CustomerQuoteResult,
  type NegotiationHistoryItem,
} from './customer-quote';
