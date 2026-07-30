import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { customerPayload, repairJobPayload, uniquePhone } from "./utils/factories";
import { getTechnicianId } from "./utils/fixtures";

const NON_EXISTENT_ID = "00000000-0000-0000-0000-000000000000";

test.describe("customers", () => {
  test("admin can create, fetch, update, and delete a customer", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const createRes = await request.post("customers", { headers, data: customerPayload({ fullName: "Suresh Kumar" }) });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.customerCode).toMatch(/^CUST-\d{4}$/);

    const getRes = await request.get(`customers/${created.id}`, { headers });
    expect(getRes.ok()).toBeTruthy();
    expect((await getRes.json()).data.fullName).toBe("Suresh Kumar");

    const updateRes = await request.put(`customers/${created.id}`, { headers, data: { fullName: "Suresh K Updated" } });
    expect(updateRes.ok()).toBeTruthy();
    expect((await updateRes.json()).data.fullName).toBe("Suresh K Updated");

    const historyRes = await request.get(`customers/${created.id}/history`, { headers });
    expect(historyRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`customers/${created.id}`, { headers });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("rejects a full name shorter than 3 characters", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.post("customers", {
      headers: authHeader(accessToken),
      data: customerPayload({ fullName: "Al" }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errors.some((e: any) => e.path === "body.fullName")).toBeTruthy();
  });

  test("rejects a phone number shorter than 10 characters", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.post("customers", {
      headers: authHeader(accessToken),
      data: customerPayload({ phoneNumber: "12345" }),
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a duplicate phone number", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const phone = uniquePhone();

    const first = await request.post("customers", { headers, data: customerPayload({ phoneNumber: phone }) });
    expect(first.status()).toBe(201);

    const dup = await request.post("customers", { headers, data: customerPayload({ phoneNumber: phone }) });
    expect(dup.status()).toBe(400);
    const body = await dup.json();
    expect(body.message).toMatch(/already exists/i);
  });

  test("requires authentication", async ({ request }) => {
    const res = await request.get("customers");
    expect(res.status()).toBe(401);
  });

  test("rejects updating to a phone number already used by another customer", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const otherPhone = uniquePhone();
    await request.post("customers", { headers, data: customerPayload({ phoneNumber: otherPhone }) });

    const createRes = await request.post("customers", { headers, data: customerPayload() });
    const customer = (await createRes.json()).data;

    const updateRes = await request.put(`customers/${customer.id}`, { headers, data: { phoneNumber: otherPhone } });
    expect(updateRes.status()).toBe(400);
    expect((await updateRes.json()).message).toMatch(/already exists/i);
  });

  test("allows re-submitting a customer's own unchanged phone number on update", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const createRes = await request.post("customers", { headers, data: customerPayload() });
    const customer = (await createRes.json()).data;

    const updateRes = await request.put(`customers/${customer.id}`, {
      headers,
      data: { phoneNumber: customer.phoneNumber, fullName: "Unchanged Phone Customer" },
    });
    expect(updateRes.status(), await updateRes.text()).toBe(200);
  });

  test("GET/PUT/DELETE on a non-existent customer id all return 404 'Customer not found'", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const getRes = await request.get(`customers/${NON_EXISTENT_ID}`, { headers });
    expect(getRes.status()).toBe(404);
    expect((await getRes.json()).message).toBe("Customer not found");

    const putRes = await request.put(`customers/${NON_EXISTENT_ID}`, { headers, data: { fullName: "Ghost" } });
    expect(putRes.status()).toBe(404);

    const deleteRes = await request.delete(`customers/${NON_EXISTENT_ID}`, { headers });
    expect(deleteRes.status()).toBe(404);

    const historyRes = await request.get(`customers/${NON_EXISTENT_ID}/history`, { headers });
    expect(historyRes.status()).toBe(404);
  });

  test("history returns the customer's own repair jobs and invoices, newest first", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = (await (await request.post("customers", { headers, data: customerPayload() })).json()).data;
    const technicianId = await getTechnicianId(request);

    const job1 = (
      await (
        await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) })
      ).json()
    ).data;
    const job2 = (
      await (
        await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) })
      ).json()
    ).data;

    const res = await request.get(`customers/${customer.id}/history`, { headers });
    expect(res.ok()).toBeTruthy();
    const history = (await res.json()).data;

    expect(history.id).toBe(customer.id);
    expect(history.repairJobs.map((j: any) => j.id)).toEqual(expect.arrayContaining([job1.id, job2.id]));
    // newest first
    expect(history.repairJobs[0].id).toBe(job2.id);
    expect(Array.isArray(history.invoices)).toBeTruthy();
  });

  test("a freshly created customer with no activity has empty history arrays", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = (await (await request.post("customers", { headers, data: customerPayload() })).json()).data;

    const res = await request.get(`customers/${customer.id}/history`, { headers });
    const history = (await res.json()).data;
    expect(history.repairJobs).toEqual([]);
    expect(history.invoices).toEqual([]);
  });

  test("list search matches name/phone/customerCode/address but not notes", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const uniqueMarker = `Marker${Date.now()}`;

    const customer = (
      await (
        await request.post("customers", {
          headers,
          data: customerPayload({ fullName: `Search Target ${uniqueMarker}`, notes: `SecretNote${uniqueMarker}` }),
        })
      ).json()
    ).data;

    const byName = await request.get(`customers?all=true&search=${encodeURIComponent(uniqueMarker)}`, { headers });
    const byNameResults = (await byName.json()).data;
    expect(byNameResults.some((c: any) => c.id === customer.id)).toBeTruthy();

    // The `search` query param only matches fullName/phoneNumber/customerCode/address —
    // notes is intentionally excluded at the repository/service layer.
    const byNotes = await request.get(
      `customers?all=true&search=${encodeURIComponent(`SecretNote${uniqueMarker}`)}`,
      { headers }
    );
    const byNotesResults = (await byNotes.json()).data;
    expect(byNotesResults.some((c: any) => c.id === customer.id)).toBeFalsy();
  });

  test("list respects pagination limit and the all=true bypass", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const limitedRes = await request.get("customers?page=1&limit=3", { headers });
    const limitedBody = await limitedRes.json();
    expect(limitedBody.data.length).toBeLessThanOrEqual(3);
    expect(limitedBody.pagination.limit).toBe(3);

    const allRes = await request.get("customers?all=true", { headers });
    const allBody = await allRes.json();
    expect(allBody.data.length).toBeGreaterThanOrEqual(limitedBody.data.length);
  });
});
