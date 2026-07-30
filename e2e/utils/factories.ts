let counter = 0;
// Monotonic + timestamp suffix keeps values unique across an entire test run
// (all specs share one DB, workers:1, but multiple calls can happen in the same ms).
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}${counter}`;
}

export function uniquePhone(): string {
  // Must be >=10 chars and unique; Customer.phoneNumber is a DB-unique column.
  // The counter must survive truncation (it's what actually varies between
  // calls in the same run) — put it last and take the timestamp's tail, not
  // its head, or every phone number in a run collides on the same prefix.
  counter += 1;
  const millis = Date.now().toString().slice(-3);
  const seq = counter.toString().padStart(6, "0");
  return `9${millis}${seq}`;
}

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}.${uniqueSuffix()}@e2e.test`;
}

export function customerPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fullName: "E2E Customer",
    phoneNumber: uniquePhone(),
    address: "1 Test Street",
    notes: "created by playwright",
    ...overrides,
  };
}

export function repairJobPayload(
  customerId: string,
  technicianId: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    jobNumber: `JOB-E2E-${uniqueSuffix()}`,
    customerId,
    technicianId,
    deviceType: "Fan",
    brand: "Crompton",
    model: "High Speed 400mm",
    problemDescription: "Not turning on",
    estimatedCost: 1500,
    receivedDate: new Date().toISOString(),
    ...overrides,
  };
}

export function categoryPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: `E2E Category ${uniqueSuffix()}`,
    description: "created by playwright",
    ...overrides,
  };
}

export function productPayload(categoryId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    categoryId,
    name: `E2E Product ${uniqueSuffix()}`,
    brand: "Generic",
    purchasePrice: 30,
    sellingPrice: 60,
    stockQuantity: 50,
    minimumStock: 10,
    ...overrides,
  };
}

export function invoicePayload(
  customerId: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  const unitPrice = 500;
  return {
    customerId,
    subtotal: unitPrice,
    discount: 0,
    tax: 0,
    grandTotal: unitPrice,
    paidAmount: 0,
    invoiceDate: new Date().toISOString(),
    items: [
      {
        itemName: "Service Charge",
        itemType: "SERVICE",
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      },
    ],
    ...overrides,
  };
}

export function paymentPayload(invoiceId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    invoiceId,
    paymentMethod: "cash",
    paymentAmount: 100,
    paymentDate: new Date().toISOString(),
    ...overrides,
  };
}

export function stockMovementPayload(
  productId: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    productId,
    movementType: "in",
    quantity: 5,
    referenceType: "MANUAL",
    ...overrides,
  };
}
