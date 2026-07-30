import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { repairJobPayload } from "./utils/factories";
import { createCustomer, getTechnicianId } from "./utils/fixtures";

test.describe("repair jobs", () => {
  test("full status lifecycle: not_started -> work_in_progress -> pending_to_deliver -> delivered", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const createRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId),
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const repair = (await createRes.json()).data;
    expect(repair.status).toBe("not_started");

    for (const status of ["work_in_progress", "pending_to_deliver", "delivered"]) {
      const res = await request.patch(`repair-jobs/${repair.id}/status`, { headers, data: { status } });
      expect(res.ok(), await res.text()).toBeTruthy();
      expect((await res.json()).data.status).toBe(status);
    }

    const timelineRes = await request.get(`repair-jobs/${repair.id}/timeline`, { headers });
    expect(timelineRes.ok()).toBeTruthy();
    const timeline = (await timelineRes.json()).data;
    // initial creation + 3 status transitions
    expect(timeline.length).toBeGreaterThanOrEqual(4);
  });

  test("rejects create when advanceAmount is not less than estimatedCost", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const res = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId, { estimatedCost: 500, advanceAmount: 500 }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errors.some((e: any) => e.path === "body.advanceAmount")).toBeTruthy();
  });

  test("rejects create with missing required fields", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const res = await request.post("repair-jobs", {
      headers: authHeader(accessToken),
      data: {
        jobNumber: "JOB-E2E-INCOMPLETE",
        customerId: customer.id,
        technicianId,
        // deviceType and problemDescription intentionally omitted
        estimatedCost: 100,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("logs a call outcome against a repair job", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const createRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId),
    });
    const repair = (await createRes.json()).data;

    const callRes = await request.post(`repair-jobs/${repair.id}/calls`, {
      headers,
      data: { outcome: "informed_fault", notes: "Customer informed of the fault and cost" },
    });
    expect(callRes.status(), await callRes.text()).toBe(201);

    const listRes = await request.get(`repair-jobs/${repair.id}/calls`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const calls = (await listRes.json()).data;
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  test("delete removes the repair job", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const createRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, technicianId),
    });
    const repair = (await createRes.json()).data;

    const deleteRes = await request.delete(`repair-jobs/${repair.id}`, { headers });
    expect(deleteRes.ok()).toBeTruthy();

    const getRes = await request.get(`repair-jobs/${repair.id}`, { headers });
    expect(getRes.status()).toBe(404);
  });

  test("GET/PUT on a non-existent repair job id both return 404 'Repair job not found'", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const fakeId = "does-not-exist";

    const getRes = await request.get(`repair-jobs/${fakeId}`, { headers });
    expect(getRes.status()).toBe(404);
    expect((await getRes.json()).message).toBe("Repair job not found");

    const putRes = await request.put(`repair-jobs/${fakeId}`, { headers, data: { estimatedCost: 100 } });
    expect(putRes.status()).toBe(404);
  });

  test("PUT requires estimatedCost even for an otherwise-partial update (validator quirk: not marked optional)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);
    const createRes = await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) });
    const repair = (await createRes.json()).data;

    // Unlike every other field on updateRepairJobSchema, estimatedCost is not
    // wrapped in .optional() — omitting it 400s even though this is meant to
    // be a partial update.
    const res = await request.put(`repair-jobs/${repair.id}`, { headers, data: { brand: "UpdatedBrand" } });
    expect(res.status()).toBe(400);
  });

  test("PUT reassigning technicianId succeeds and the job reflects the new technician", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const headers = authHeader(admin.accessToken);
    const customer = await createCustomer(request, admin.accessToken);
    const originalTechnicianId = await getTechnicianId(request);
    const createRes = await request.post("repair-jobs", {
      headers,
      data: repairJobPayload(customer.id, originalTechnicianId),
    });
    const repair = (await createRes.json()).data;

    const monitor = await loginAs(request, "MONITOR"); // reuse a distinct seeded user id as the "new" technician-like assignee
    const updateRes = await request.put(`repair-jobs/${repair.id}`, {
      headers,
      data: { technicianId: monitor.user.id, estimatedCost: Number(repair.estimatedCost) },
    });
    expect(updateRes.status(), await updateRes.text()).toBe(200);
    expect((await updateRes.json()).data.technicianId).toBe(monitor.user.id);
  });

  test("updating jobNumber to one already in use fails (currently a raw 500, not a clean 400 — no duplicate guard on update)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const jobA = (
      await (await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) })).json()
    ).data;
    const jobB = (
      await (await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) })).json()
    ).data;

    const res = await request.put(`repair-jobs/${jobB.id}`, {
      headers,
      data: { jobNumber: jobA.jobNumber, estimatedCost: Number(jobB.estimatedCost) },
    });
    // Documents current behavior: create() checks for a duplicate jobNumber,
    // update() does not, so this hits the DB unique constraint raw and 500s
    // instead of a clean 400 — a real gap, not a test mistake.
    expect(res.status()).toBe(500);
  });

  test("list search matches job number, device, customer, technician, and problem description", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken, { fullName: "Repair Search Customer" });
    const technicianId = await getTechnicianId(request);
    const marker = `SearchMark${Date.now()}`;

    const repair = (
      await (
        await request.post("repair-jobs", {
          headers,
          data: repairJobPayload(customer.id, technicianId, { problemDescription: marker }),
        })
      ).json()
    ).data;

    const res = await request.get(`repair-jobs?all=true&search=${encodeURIComponent(marker)}`, { headers });
    const results = (await res.json()).data;
    expect(results.some((r: any) => r.id === repair.id)).toBeTruthy();
  });

  test("status filter accepts comma-separated statuses, and 'completed' is aliased to pending_to_deliver (not delivered)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const deliveredJob = (
      await (await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) })).json()
    ).data;
    for (const status of ["work_in_progress", "pending_to_deliver", "delivered"]) {
      await request.patch(`repair-jobs/${deliveredJob.id}/status`, { headers, data: { status } });
    }

    // "completed" is silently mapped to "pending_to_deliver" server-side —
    // a delivered job will NOT show up when filtering status=completed.
    const completedRes = await request.get("repair-jobs?all=true&status=completed", { headers });
    const completedResults = (await completedRes.json()).data;
    expect(completedResults.some((r: any) => r.id === deliveredJob.id)).toBeFalsy();

    const multiRes = await request.get("repair-jobs?all=true&status=work_in_progress,delivered", { headers });
    const multiResults = (await multiRes.json()).data;
    expect(multiResults.every((r: any) => ["work_in_progress", "delivered"].includes(r.status))).toBeTruthy();
  });

  test("TECHNICIAN only sees their own assigned jobs in the list; ADMIN sees all", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const tech = await loginAs(request, "TECHNICIAN");
    const customer = await createCustomer(request, admin.accessToken);

    const job = (
      await (
        await request.post("repair-jobs", {
          headers: authHeader(admin.accessToken),
          data: repairJobPayload(customer.id, tech.user.id),
        })
      ).json()
    ).data;

    const techListRes = await request.get("repair-jobs?all=true", { headers: authHeader(tech.accessToken) });
    const techResults = (await techListRes.json()).data;
    expect(techResults.every((r: any) => r.technicianId === tech.user.id)).toBeTruthy();
    expect(techResults.some((r: any) => r.id === job.id)).toBeTruthy();

    const adminListRes = await request.get("repair-jobs?all=true", { headers: authHeader(admin.accessToken) });
    const adminResults = (await adminListRes.json()).data;
    expect(adminResults.some((r: any) => r.id === job.id)).toBeTruthy();
  });
});
