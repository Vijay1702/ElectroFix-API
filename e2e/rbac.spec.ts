import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { createCategory, createCustomer } from "./utils/fixtures";

// Locks in the current role matrix discovered by reading every routes/*.ts file.
// Where a route currently has NO role guard, the test documents that fact rather
// than assuming a guard that doesn't exist — so a future regression (someone
// accidentally loosening or tightening access) shows up as a failing assertion
// either direction, not a silent gap.

test.describe("rbac — admin-only routes reject technician and monitor", () => {
  // Deliberately excludes /reports/* here — that module is gated for ADMIN
  // *and* MONITOR (see the next describe block), not admin-only.
  const cases: Array<{ name: string; call: (request: any, token: string) => Promise<any> }> = [
    { name: "POST /categories", call: (r, t) => r.post("categories", { headers: authHeader(t), data: { name: "x" } }) },
    { name: "POST /users", call: (r, t) => r.post("users", { headers: authHeader(t), data: { fullName: "X Y Z", email: "blocked@e2e.test", phoneNumber: "9000000099", password: "secret1", role: "ADMIN" } }) },
    { name: "POST /attendance/bulk", call: (r, t) => r.post("attendance/bulk", { headers: authHeader(t), data: { date: "2020-01-01", records: [] } }) },
    { name: "GET /attendance/payroll", call: (r, t) => r.get("attendance/payroll", { headers: authHeader(t) }) },
  ];

  for (const role of ["TECHNICIAN", "MONITOR"] as const) {
    for (const { name, call } of cases) {
      test(`${role} is forbidden from ${name}`, async ({ request }) => {
        const { accessToken } = await loginAs(request, role);
        const res = await call(request, accessToken);
        expect(res.status()).toBe(403);
      });
    }
  }
});

test.describe("rbac — audit and reports allow MONITOR but not TECHNICIAN", () => {
  test("MONITOR can read /reports/sales, TECHNICIAN cannot", async ({ request }) => {
    const monitor = await loginAs(request, "MONITOR");
    const tech = await loginAs(request, "TECHNICIAN");

    const monitorRes = await request.get("reports/sales", { headers: authHeader(monitor.accessToken) });
    expect(monitorRes.ok()).toBeTruthy();

    const techRes = await request.get("reports/sales", { headers: authHeader(tech.accessToken) });
    expect(techRes.status()).toBe(403);
  });
});

test.describe("rbac — STAFF allowed on stock-movements and payments", () => {
  test("STAFF can create a stock movement but not a category", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const category = await createCategory(request, admin.accessToken);
    const productRes = await request.post("products", {
      headers: authHeader(admin.accessToken),
      data: { categoryId: category.id, name: "Staff Test Product", purchasePrice: 10, sellingPrice: 20, stockQuantity: 5, minimumStock: 1 },
    });
    const product = (await productRes.json()).data;

    const staff = await loginAs(request, "STAFF");
    const stockRes = await request.post("stock-movements", {
      headers: authHeader(staff.accessToken),
      data: { productId: product.id, movementType: "in", quantity: 1 },
    });
    expect(stockRes.status()).toBe(201);

    const categoryRes = await request.post("categories", { headers: authHeader(staff.accessToken), data: { name: "blocked" } });
    expect(categoryRes.status()).toBe(403);
  });
});

test.describe("rbac — users, customers and repair-jobs are now guarded", () => {
  test("TECHNICIAN is forbidden from updating another user's record via PUT /users/:id", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");

    const res = await request.put(`users/${admin.user.id}`, {
      headers: authHeader(tech.accessToken),
      data: { fullName: "Renamed By Technician" },
    });
    expect(res.status()).toBe(403);
  });

  test("TECHNICIAN is forbidden from deleting a user", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");

    const res = await request.delete(`users/${admin.user.id}`, { headers: authHeader(tech.accessToken) });
    expect(res.status()).toBe(403);
  });

  test("TECHNICIAN can create/update customers but not delete one", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const tech = await loginAs(request, "TECHNICIAN");

    const updateRes = await request.put(`customers/${customer.id}`, {
      headers: authHeader(tech.accessToken),
      data: { fullName: "Updated By Technician" },
    });
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`customers/${customer.id}`, { headers: authHeader(tech.accessToken) });
    expect(deleteRes.status()).toBe(403);
  });

  test("MONITOR is forbidden from creating or updating a customer", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const monitor = await loginAs(request, "MONITOR");

    const createRes = await request.post("customers", {
      headers: authHeader(monitor.accessToken),
      data: { fullName: "Blocked Customer", phoneNumber: "9000000098" },
    });
    expect(createRes.status()).toBe(403);

    const updateRes = await request.put(`customers/${customer.id}`, {
      headers: authHeader(monitor.accessToken),
      data: { fullName: "Blocked Update" },
    });
    expect(updateRes.status()).toBe(403);
  });

  test("TECHNICIAN is forbidden from deleting a repair job", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const tech = await loginAs(request, "TECHNICIAN");

    const repairRes = await request.post("repair-jobs", {
      headers: authHeader(tech.accessToken),
      data: {
        jobNumber: `JOB-E2E-RBAC-${Date.now()}`,
        customerId: customer.id,
        technicianId: tech.user.id,
        deviceType: "Phone",
        problemDescription: "Screen cracked",
        estimatedCost: 500,
      },
    });
    const repair = (await repairRes.json()).data;

    const deleteRes = await request.delete(`repair-jobs/${repair.id}`, { headers: authHeader(tech.accessToken) });
    expect(deleteRes.status()).toBe(403);
  });

  test("MONITOR is forbidden from creating a repair job", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const monitor = await loginAs(request, "MONITOR");

    const res = await request.post("repair-jobs", {
      headers: authHeader(monitor.accessToken),
      data: { customerId: customer.id, deviceType: "Phone", problemDescription: "Blocked" },
    });
    expect(res.status()).toBe(403);
  });
});
