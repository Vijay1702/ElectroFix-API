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

test.describe("rbac — known gaps: routes with no role guard at all", () => {
  test("any authenticated user (even TECHNICIAN) can update another user's record via PUT /users/:id", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");

    const res = await request.put(`users/${admin.user.id}`, {
      headers: authHeader(tech.accessToken),
      data: { fullName: "Renamed By Technician" },
    });
    // Documents current (unguarded) behavior — this succeeding is the known gap.
    expect(res.ok()).toBeTruthy();

    // restore the admin's name so other tests/readers aren't confused
    await request.put(`users/${admin.user.id}`, { headers: authHeader(admin.accessToken), data: { fullName: "E2E Admin" } });
  });

  test("the customers module has no role guard — TECHNICIAN can delete a customer", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);

    const tech = await loginAs(request, "TECHNICIAN");
    const res = await request.delete(`customers/${customer.id}`, { headers: authHeader(tech.accessToken) });
    expect(res.ok()).toBeTruthy();
  });
});
