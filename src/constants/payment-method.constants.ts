export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
