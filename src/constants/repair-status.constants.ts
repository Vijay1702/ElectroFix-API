export const REPAIR_STATUS = {
  RECEIVED: "received",
  UNDER_INSPECTION: "under_inspection",
  UNDER_REPAIR: "under_repair",
  WAITING_PARTS: "waiting_parts",
  READY_FOR_DELIVERY: "ready_for_delivery",
  DELIVERED: "delivered",
} as const;

export type RepairStatusType = (typeof REPAIR_STATUS)[keyof typeof REPAIR_STATUS];
