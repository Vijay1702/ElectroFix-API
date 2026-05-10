export const PAYMENT_STATUS = {
  PAID: "paid",
  PARTIAL: "partial",
  PENDING: "pending",
} as const;

export type PaymentStatusType = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
