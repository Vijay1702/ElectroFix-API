export const REPAIR_STATUS = {
  NOT_STARTED: "not_started",
  WORK_IN_PROGRESS: "work_in_progress",
  PENDING_TO_DELIVER: "pending_to_deliver",
  DELIVERED: "delivered",
} as const;

export type RepairStatusType = (typeof REPAIR_STATUS)[keyof typeof REPAIR_STATUS];
