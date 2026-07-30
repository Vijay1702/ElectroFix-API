import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { invoicePayload, repairJobPayload } from "./utils/factories";
import { createCategory, createCustomer, createProduct, getTechnicianId } from "./utils/fixtures";

// Covers all 9 GET /dashboard/* endpoints — previously zero test coverage.
// All are auth-only (no role gate at the route level); getSummary/
// getRecentRepairs additionally narrow data by technicianId for non-ADMIN/
// MONITOR callers inside the service layer (not a 403, just filtered data).

test.describe("dashboard", () => {
  test("requires authentication", async ({ request }) => {
    const res = await request.get("dashboard/summary");
    expect(res.status()).toBe(401);
  });

  test("summary counts move by exactly the expected delta after creating a customer, product, and repair job", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const before = (await (await request.get("dashboard/summary", { headers })).json()).data;

    const customer = await createCustomer(request, accessToken);
    const category = await createCategory(request, accessToken);
    await createProduct(request, accessToken, category.id, { stockQuantity: 20, minimumStock: 5 });
    const technicianId = await getTechnicianId(request);
    const repairRes = await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) });
    expect(repairRes.status(), await repairRes.text()).toBe(201);

    const after = (await (await request.get("dashboard/summary", { headers })).json()).data;

    expect(after.totalCustomers).toBe(before.totalCustomers + 1);
    expect(after.totalProducts).toBe(before.totalProducts + 1);
    expect(after.totalRepairs).toBe(before.totalRepairs + 1);
    // Fresh repair jobs default to "not_started", which counts as active.
    expect(after.activeRepairs).toBe(before.activeRepairs + 1);
  });

  test("summary's repair counts for a TECHNICIAN caller only reflect their own assigned jobs", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");
    const customer = await createCustomer(request, admin.accessToken);

    const before = (await (await request.get("dashboard/summary", { headers: authHeader(tech.accessToken) })).json())
      .data;

    await request.post("repair-jobs", {
      headers: authHeader(admin.accessToken),
      data: repairJobPayload(customer.id, tech.user.id),
    });

    const after = (await (await request.get("dashboard/summary", { headers: authHeader(tech.accessToken) })).json())
      .data;
    expect(after.totalRepairs).toBe(before.totalRepairs + 1);
  });

  test("low-stock lists a product at/under its minimum stock", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const lowStockProduct = await createProduct(request, accessToken, category.id, {
      stockQuantity: 2,
      minimumStock: 10,
    });

    const res = await request.get("dashboard/low-stock?limit=200", { headers });
    expect(res.ok()).toBeTruthy();
    const items = (await res.json()).data;
    const found = items.find((p: any) => p.id === lowStockProduct.id);
    expect(found, "newly created low-stock product should appear in the low-stock list").toBeTruthy();
    expect(found.stockQuantity).toBeLessThanOrEqual(found.minimumStock);
  });

  test("recent-repairs only includes not_started/work_in_progress statuses, excludes delivered", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const activeRes = await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) });
    const active = (await activeRes.json()).data;

    const deliveredRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId),
    });
    const delivered = (await deliveredRes.json()).data;
    await request.patch(`repair-jobs/${delivered.id}/status`, { headers, data: { status: "work_in_progress" } });
    await request.patch(`repair-jobs/${delivered.id}/status`, { headers, data: { status: "pending_to_deliver" } });
    await request.patch(`repair-jobs/${delivered.id}/status`, { headers, data: { status: "delivered" } });

    const res = await request.get("dashboard/recent-repairs?limit=200", { headers });
    const items = (await res.json()).data;
    expect(items.some((r: any) => r.id === active.id)).toBeTruthy();
    expect(items.some((r: any) => r.id === delivered.id)).toBeFalsy();

    const activeItem = items.find((r: any) => r.id === active.id);
    expect(activeItem.customer.id).toBe(customer.id);
    expect(activeItem.technician.id).toBe(technicianId);
  });

  test("recent-repairs falls back to a max of 5 when limit is omitted or 0", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const resOmitted = await request.get("dashboard/recent-repairs", { headers });
    expect((await resOmitted.json()).data.length).toBeLessThanOrEqual(5);

    // parseInt(limit,10) || 5 — "0" parses to a falsy 0, so it falls back to 5
    // (unlike top-products/top-devices/top-customers, which treat 0 as valid — see below).
    const resZero = await request.get("dashboard/recent-repairs?limit=0", { headers });
    expect((await resZero.json()).data.length).toBeLessThanOrEqual(5);
  });

  test("recent-sales lists a newly created invoice with its customer embedded", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await invRes.json()).data;

    const res = await request.get("dashboard/recent-sales?limit=200", { headers });
    const items = (await res.json()).data;
    const found = items.find((i: any) => i.id === invoice.id);
    expect(found).toBeTruthy();
    expect(found.customer.id).toBe(customer.id);
  });

  test("technician-workload includes a technician with an active job assigned", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");
    const customer = await createCustomer(request, admin.accessToken);
    await request.post("repair-jobs", {
      headers: authHeader(admin.accessToken),
      data: repairJobPayload(customer.id, tech.user.id),
    });

    const res = await request.get("dashboard/technician-workload", { headers: authHeader(admin.accessToken) });
    const items = (await res.json()).data;
    const entry = items.find((t: any) => t.id === tech.user.id);
    expect(entry).toBeTruthy();
    expect(entry._count.repairJobs).toBeGreaterThanOrEqual(1);
  });

  test("weekly-performance returns 7 daily buckets by default", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.get("dashboard/weekly-performance", { headers: authHeader(accessToken) });
    expect(res.ok()).toBeTruthy();
    const items = (await res.json()).data;
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.length).toBe(7);
    for (const item of items) {
      expect(item).toHaveProperty("day");
      expect(item).toHaveProperty("revenue");
      expect(item).toHaveProperty("repairs");
    }
  });

  test("weekly-performance returns 24 hourly buckets for a same-day range", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const today = new Date().toISOString().slice(0, 10);
    const res = await request.get(`dashboard/weekly-performance?startDate=${today}&endDate=${today}`, {
      headers: authHeader(accessToken),
    });
    const items = (await res.json()).data;
    expect(items.length).toBe(24);
  });

  test("top-products includes a product sold via a PRODUCT invoice line item", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 20, sellingPrice: 100 });

    await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, {
        subtotal: 200,
        grandTotal: 200,
        items: [
          { productId: product.id, itemName: product.name, itemType: "PRODUCT", quantity: 2, unitPrice: 100, totalPrice: 200 },
        ],
      }),
    });

    const res = await request.get("dashboard/top-products?limit=200", { headers });
    const items = (await res.json()).data;
    const found = items.find((p: any) => p.id === product.id);
    expect(found).toBeTruthy();
    expect(found.totalRevenue).toBeGreaterThanOrEqual(200);
  });

  test("top-products with limit=0 returns an empty array (differs from recent-repairs' 0-means-default quirk)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    // limit ? parseInt(limit) : 5 — the string "0" is truthy, so parseInt("0")=0 is used as-is.
    const res = await request.get("dashboard/top-products?limit=0", { headers: authHeader(accessToken) });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).data).toEqual([]);
  });

  test("top-devices includes a device type from a repair-linked invoice", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);
    const deviceType = `E2E-Device-${Date.now()}`;

    const repairRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId, { deviceType }),
    });
    const repair = (await repairRes.json()).data;

    await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { repairJobId: repair.id, subtotal: 500, grandTotal: 500 }),
    });

    const res = await request.get("dashboard/top-devices?limit=200", { headers });
    const items = (await res.json()).data;
    const found = items.find((d: any) => d.name === deviceType);
    expect(found).toBeTruthy();
    expect(found.totalRevenue).toBeGreaterThanOrEqual(500);
  });

  test("top-customers includes a customer from a new invoice", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    await request.post("invoices", { headers, data: invoicePayload(customer.id, { subtotal: 300, grandTotal: 300 }) });

    const res = await request.get("dashboard/top-customers?limit=200", { headers });
    const items = (await res.json()).data;
    const found = items.find((c: any) => c.id === customer.id);
    expect(found).toBeTruthy();
    expect(found.code).toBe(customer.customerCode);
    expect(found.totalRevenue).toBeGreaterThanOrEqual(300);
  });
});
