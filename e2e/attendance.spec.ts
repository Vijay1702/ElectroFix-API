import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";

// Uses a fixed date far in the past so repeated test runs never collide with
// attendance rows another test/run may have created for "today".
const TEST_DATE = "2020-01-15";

test.describe("attendance", () => {
  test("admin can bulk-mark attendance and it is reflected per employee", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");
    const headers = authHeader(admin.accessToken);

    const bulkRes = await request.post("attendance/bulk", {
      headers,
      data: { date: TEST_DATE, records: [{ employeeId: tech.user.id, status: "Present" }] },
    });
    expect(bulkRes.status(), await bulkRes.text()).toBe(201);

    const listRes = await request.get(`attendance?date=${TEST_DATE}&employeeId=${tech.user.id}`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const records = (await listRes.json()).data;
    expect(records.some((r: any) => r.employeeId === tech.user.id && r.status === "Present")).toBeTruthy();
  });

  test("non-admin's employeeId filter is forced to their own id regardless of query param", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");

    await request.post("attendance/bulk", {
      headers: authHeader(admin.accessToken),
      data: { date: TEST_DATE, records: [{ employeeId: tech.user.id, status: "Present" }] },
    });

    // Try to query someone else's attendance as a technician
    const res = await request.get(`attendance?date=${TEST_DATE}&employeeId=${admin.user.id}`, {
      headers: authHeader(tech.accessToken),
    });
    expect(res.ok()).toBeTruthy();
    const records = (await res.json()).data;
    expect(records.length).toBeGreaterThan(0);
    // Every record returned must belong to the technician, never the admin id requested.
    for (const record of records) {
      expect(record.employeeId).toBe(tech.user.id);
    }
  });

  test("only ADMIN can bulk-mark attendance", async ({ request }) => {
    const tech = await loginAs(request, "TECHNICIAN");
    const res = await request.post("attendance/bulk", {
      headers: authHeader(tech.accessToken),
      data: { date: TEST_DATE, records: [] },
    });
    expect(res.status()).toBe(403);
  });

  test("payroll includes technicians with correct present-day wage calculation", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");
    const headers = authHeader(admin.accessToken);

    await request.post("attendance/bulk", {
      headers,
      data: { date: TEST_DATE, records: [{ employeeId: tech.user.id, status: "Present" }] },
    });

    const [year, month] = TEST_DATE.split("-");
    const payrollRes = await request.get(`attendance/payroll?month=${Number(month)}&year=${year}`, { headers });
    expect(payrollRes.ok()).toBeTruthy();
    const payroll = (await payrollRes.json()).data;
    const entry = payroll.payroll.find((p: any) => p.employeeId === tech.user.id);
    expect(entry).toBeTruthy();
    expect(entry.presentDays).toBeGreaterThanOrEqual(1);
    expect(entry.totalSalary).toBe(entry.presentDays * entry.perDaySalary);
  });

  test("only ADMIN can view payroll", async ({ request }) => {
    const tech = await loginAs(request, "TECHNICIAN");
    const res = await request.get("attendance/payroll", { headers: authHeader(tech.accessToken) });
    expect(res.status()).toBe(403);
  });
});
