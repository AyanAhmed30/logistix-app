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
  type CustomerQuote,
  type CustomerQuoteResult,
} from './customer-quote';
