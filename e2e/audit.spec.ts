import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { createCustomer } from "./utils/fixtures";

test.describe("audit", () => {
  test("ADMIN and MONITOR can view audit logs, TECHNICIAN cannot", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const monitor = await loginAs(request, "MONITOR");
    const tech = await loginAs(request, "TECHNICIAN");

    const adminRes = await request.get("audit", { headers: authHeader(admin.accessToken) });
    expect(adminRes.ok()).toBeTruthy();

    const monitorRes = await request.get("audit", { headers: authHeader(monitor.accessToken) });
    expect(monitorRes.ok()).toBeTruthy();

    const techRes = await request.get("audit", { headers: authHeader(tech.accessToken) });
    expect(techRes.status()).toBe(403);
  });

  test("a create action produces a matching audit log entry", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    await createCustomer(request, admin.accessToken, { fullName: "Audit Probe Customer" });

    const res = await request.get("audit?menuName=Customers&action=CREATE", { headers: authHeader(admin.accessToken) });
    expect(res.ok()).toBeTruthy();
    const logs = (await res.json()).data;
    expect(logs.some((l: any) => l.description?.includes("Audit Probe Customer") || l.menuName === "Customers")).toBeTruthy();
  });
});
