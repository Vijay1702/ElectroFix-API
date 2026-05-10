export const STOCK_MOVEMENT_TYPE = {
  IN: "in",
  OUT: "out",
  ADJUSTMENT: "adjustment",
} as const;

export type StockMovementTypeValue = (typeof STOCK_MOVEMENT_TYPE)[keyof typeof STOCK_MOVEMENT_TYPE];
