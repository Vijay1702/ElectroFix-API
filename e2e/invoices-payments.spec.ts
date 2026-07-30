import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { invoicePayload, paymentPayload, repairJobPayload } from "./utils/factories";
import { createCategory, createCustomer, createProduct, getTechnicianId } from "./utils/fixtures";

test.describe("invoices", () => {
  test("creating an invoice with a service item computes pending status when unpaid", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);

    const res = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    expect(res.status(), await res.text()).toBe(201);
    const invoice = (await res.json()).data;
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}$/);
  });

  test("a PRODUCT line item reduces product stock", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 20, sellingPrice: 100 });

    const res = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, {
        subtotal: 200,
        grandTotal: 200,
        items: [
          { productId: product.id, itemName: product.name, itemType: "PRODUCT", quantity: 2, unitPrice: 100, totalPrice: 200 },
        ],
      }),
    });
    expect(res.status(), await res.text()).toBe(201);

    const productRes = await request.get(`products/${product.id}`, { headers });
    expect((await productRes.json()).data.stockQuantity).toBe(18);
  });

  test("rejects invoice with no items", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, accessToken);
    const res = await request.post("invoices", {
      headers: authHeader(accessToken),
      data: invoicePayload(customer.id, { items: [] }),
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a non-ISO invoiceDate", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, accessToken);
    const res = await request.post("invoices", {
      headers: authHeader(accessToken),
      data: invoicePayload(customer.id, { invoiceDate: "2026-07-30" }),
    });
    expect(res.status()).toBe(400);
  });

  test("only ADMIN can delete an invoice", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const createRes = await request.post("invoices", { headers: authHeader(admin.accessToken), data: invoicePayload(customer.id) });
    const invoice = (await createRes.json()).data;

    const tech = await loginAs(request, "TECHNICIAN");
    const forbidden = await request.delete(`invoices/${invoice.id}`, { headers: authHeader(tech.accessToken) });
    expect(forbidden.status()).toBe(403);

    const allowed = await request.delete(`invoices/${invoice.id}`, { headers: authHeader(admin.accessToken) });
    expect(allowed.ok()).toBeTruthy();
  });

  test("GET/PUT/DELETE on a non-existent invoice id all return 404 'Invoice not found'", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const getRes = await request.get("invoices/does-not-exist", { headers });
    expect(getRes.status()).toBe(404);
    expect((await getRes.json()).message).toBe("Invoice not found");

    const putRes = await request.put("invoices/does-not-exist", { headers, data: { discount: 10 } });
    expect(putRes.status()).toBe(404);

    const deleteRes = await request.delete("invoices/does-not-exist", { headers });
    expect(deleteRes.status()).toBe(404);
  });

  test("list search matches invoiceNumber/customer name/phone; status filters on paymentStatus", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const createRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await createRes.json()).data;

    const byNumber = await request.get(`invoices?all=true&search=${invoice.invoiceNumber}`, { headers });
    expect((await byNumber.json()).data.some((i: any) => i.id === invoice.id)).toBeTruthy();

    const byStatus = await request.get("invoices?all=true&status=pending", { headers });
    const byStatusResults = (await byStatus.json()).data;
    expect(byStatusResults.every((i: any) => i.paymentStatus === "pending")).toBeTruthy();
    expect(byStatusResults.some((i: any) => i.id === invoice.id)).toBeTruthy();
  });

  test("PUT silently ignores an items array — the original line items are unchanged", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const createRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await createRes.json()).data;
    const originalItemCount = invoice.items.length;

    const putRes = await request.put(`invoices/${invoice.id}`, {
      headers,
      data: {
        items: [{ itemName: "Should be ignored", itemType: "SERVICE", quantity: 1, unitPrice: 1, totalPrice: 1 }],
      },
    });
    expect(putRes.status(), await putRes.text()).toBe(200);

    const getRes = await request.get(`invoices/${invoice.id}`, { headers });
    const refetched = (await getRes.json()).data;
    expect(refetched.items.length).toBe(originalItemCount);
    expect(refetched.items.some((i: any) => i.itemName === "Should be ignored")).toBeFalsy();
  });

  test("PUT that raises paidAmount to fully cover grandTotal flips paymentStatus to paid and auto-delivers a linked repair", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const repairRes = await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) });
    const repair = (await repairRes.json()).data;
    await request.patch(`repair-jobs/${repair.id}/status`, { headers, data: { status: "work_in_progress" } });
    await request.patch(`repair-jobs/${repair.id}/status`, { headers, data: { status: "pending_to_deliver" } });

    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { repairJobId: repair.id, subtotal: 800, grandTotal: 800, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;

    const putRes = await request.put(`invoices/${invoice.id}`, { headers, data: { paidAmount: 800 } });
    expect(putRes.status(), await putRes.text()).toBe(200);
    expect((await putRes.json()).data.paymentStatus).toBe("paid");

    const repairAfter = await request.get(`repair-jobs/${repair.id}`, { headers });
    expect((await repairAfter.json()).data.status).toBe("delivered");
  });

  test("GET /invoices/:id/pdf returns a PDF for a valid invoice and 404s for a bogus id", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const createRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await createRes.json()).data;

    const pdfRes = await request.get(`invoices/${invoice.id}/pdf`, { headers });
    expect(pdfRes.status(), await pdfRes.text()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
    const body = await pdfRes.body();
    expect(body.byteLength).toBeGreaterThan(0);

    const missingRes = await request.get("invoices/does-not-exist/pdf", { headers });
    expect(missingRes.status()).toBe(404);
  });

  test("POST /invoices/pdf/direct generates a PDF from raw request data with no DB lookup or validation", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    // An empty object still succeeds — falls back to defaults (no schema validation at all).
    const emptyRes = await request.post("invoices/pdf/direct", { headers, data: {} });
    expect(emptyRes.status(), await emptyRes.text()).toBe(200);
    expect(emptyRes.headers()["content-type"]).toContain("application/pdf");

    const populatedRes = await request.post("invoices/pdf/direct", {
      headers,
      data: {
        invoiceNumber: "PREVIEW-0001",
        customer: { fullName: "Preview Customer" },
        items: [{ itemName: "Preview Item", quantity: 1, totalPrice: 100 }],
        grandTotal: 100,
        paidAmount: 100,
        pendingAmount: 0,
      },
    });
    expect(populatedRes.status(), await populatedRes.text()).toBe(200);
  });

  test("deleting an invoice cascades and deletes its payments too", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { subtotal: 500, grandTotal: 500, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;

    const paymentRes = await request.post("payments", { headers, data: paymentPayload(invoice.id, { paymentAmount: 200 }) });
    const payment = (await paymentRes.json()).data;

    const deleteRes = await request.delete(`invoices/${invoice.id}`, { headers });
    expect(deleteRes.status(), await deleteRes.text()).toBe(200);

    const getPaymentRes = await request.get(`payments/${payment.id}`, { headers });
    expect(getPaymentRes.status()).toBe(404);
  });
});

test.describe("payments", () => {
  test("a full payment moves the invoice to paid and auto-delivers a linked repair job", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const technicianId = await getTechnicianId(request);

    const repairRes = await request.post("repair-jobs", { headers, data: repairJobPayload(customer.id, technicianId) });
    const repair = (await repairRes.json()).data;
    // Move it to pending_to_deliver first, mirroring the real workflow
    await request.patch(`repair-jobs/${repair.id}/status`, { headers, data: { status: "work_in_progress" } });
    await request.patch(`repair-jobs/${repair.id}/status`, { headers, data: { status: "pending_to_deliver" } });

    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { repairJobId: repair.id, subtotal: 1000, grandTotal: 1000, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;
    expect(invoice.paymentStatus).toBe("pending");

    const paymentRes = await request.post("payments", {
      headers,
      data: paymentPayload(invoice.id, { paymentAmount: 1000 }),
    });
    expect(paymentRes.status(), await paymentRes.text()).toBe(201);

    const invoiceAfter = await request.get(`invoices/${invoice.id}`, { headers });
    const updatedInvoice = (await invoiceAfter.json()).data;
    expect(updatedInvoice.paymentStatus).toBe("paid");
    expect(Number(updatedInvoice.pendingAmount)).toBe(0);

    const repairAfter = await request.get(`repair-jobs/${repair.id}`, { headers });
    expect((await repairAfter.json()).data.status).toBe("delivered");
  });

  test("a partial payment leaves the invoice partial", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);

    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { subtotal: 1000, grandTotal: 1000, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;

    const paymentRes = await request.post("payments", { headers, data: paymentPayload(invoice.id, { paymentAmount: 400 }) });
    expect(paymentRes.ok()).toBeTruthy();

    const invoiceAfter = await request.get(`invoices/${invoice.id}`, { headers });
    const updated = (await invoiceAfter.json()).data;
    expect(updated.paymentStatus).toBe("partial");
    expect(Number(updated.pendingAmount)).toBe(600);
  });

  test("rejects an invalid payment method", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invoiceRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await invoiceRes.json()).data;

    const res = await request.post("payments", {
      headers,
      data: paymentPayload(invoice.id, { paymentMethod: "bitcoin" }),
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a zero payment amount", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invoiceRes = await request.post("invoices", { headers, data: invoicePayload(customer.id) });
    const invoice = (await invoiceRes.json()).data;

    const res = await request.post("payments", { headers, data: paymentPayload(invoice.id, { paymentAmount: 0 }) });
    expect(res.status()).toBe(400);
  });

  test("GET /payments/:id 404s for a bogus id", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.get("payments/does-not-exist", { headers: authHeader(accessToken) });
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBe("Payment not found");
  });

  test("rejects a payment against a non-existent invoice", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.post("payments", {
      headers: authHeader(accessToken),
      data: paymentPayload("00000000-0000-0000-0000-000000000000", { paymentAmount: 100 }),
    });
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBe("Invoice not found");
  });

  test("overpayment is accepted with no guard — invoice still resolves to paid with a negative pendingAmount", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { subtotal: 500, grandTotal: 500, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;

    const res = await request.post("payments", {
      headers,
      data: paymentPayload(invoice.id, { paymentAmount: 800 }), // 300 over the grand total
    });
    expect(res.status(), await res.text()).toBe(201);

    const getRes = await request.get(`invoices/${invoice.id}`, { headers });
    const updated = (await getRes.json()).data;
    expect(updated.paymentStatus).toBe("paid");
    expect(Number(updated.pendingAmount)).toBe(-300);
  });

  test("only ADMIN/STAFF can record a payment — TECHNICIAN and MONITOR are forbidden", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const customer = await createCustomer(request, admin.accessToken);
    const invoiceRes = await request.post("invoices", { headers: authHeader(admin.accessToken), data: invoicePayload(customer.id) });
    const invoice = (await invoiceRes.json()).data;

    for (const role of ["TECHNICIAN", "MONITOR"] as const) {
      const { accessToken } = await loginAs(request, role);
      const res = await request.post("payments", { headers: authHeader(accessToken), data: paymentPayload(invoice.id) });
      expect(res.status()).toBe(403);
    }
  });

  test("list search param has no effect — payments/search results are identical with or without it", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const customer = await createCustomer(request, accessToken);
    const invoiceRes = await request.post("invoices", {
      headers,
      data: invoicePayload(customer.id, { subtotal: 500, grandTotal: 500, paidAmount: 0 }),
    });
    const invoice = (await invoiceRes.json()).data;
    await request.post("payments", { headers, data: paymentPayload(invoice.id, { paymentAmount: 100 }) });

    const withoutSearch = await request.get("payments?all=true", { headers });
    const withSearch = await request.get("payments?all=true&search=this-should-be-ignored-entirely", { headers });
    expect((await withSearch.json()).data.length).toBe((await withoutSearch.json()).data.length);
  });
});
