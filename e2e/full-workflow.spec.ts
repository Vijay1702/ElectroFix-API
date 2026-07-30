import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { customerPayload, invoicePayload, paymentPayload, repairJobPayload, uniqueEmail, uniquePhone } from "./utils/factories";

// One chained scenario carrying state between steps, mirroring the real shop
// workflow end to end: onboard staff -> intake a customer -> open a repair job
// -> progress it through the full lifecycle -> bill it -> collect payment ->
// mark the technician's attendance -> confirm payroll -> confirm the audit trail.
test("full business workflow: onboarding through payroll and audit", async ({ request }) => {
  const admin = await loginAs(request, "ADMIN");
  const adminHeaders = authHeader(admin.accessToken);

  // 1. Onboard a fresh technician
  const newTechEmail = uniqueEmail("workflow-tech");
  const onboardRes = await request.post("users", {
    headers: adminHeaders,
    data: {
      fullName: "Workflow Technician",
      email: newTechEmail,
      phoneNumber: uniquePhone(),
      password: "Workflow@123",
      role: "TECHNICIAN",
      perDaySalary: 800,
    },
  });
  expect(onboardRes.status(), await onboardRes.text()).toBe(201);
  const technician = (await onboardRes.json()).data;

  const techLogin = await loginAs(request, "TECHNICIAN"); // sanity: seeded technician can still log in
  expect(techLogin.user.role).toBe("TECHNICIAN");

  const newTechLoginRes = await request.post("auth/login", { data: { email: newTechEmail, password: "Workflow@123" } });
  expect(newTechLoginRes.ok()).toBeTruthy();

  // 2. Create a customer
  const customerRes = await request.post("customers", {
    headers: adminHeaders,
    data: customerPayload({ fullName: "Workflow Customer" }),
  });
  expect(customerRes.status()).toBe(201);
  const customer = (await customerRes.json()).data;

  // 3. Open a repair job assigned to the new technician
  const repairRes = await request.post("repair-jobs", {
    headers: adminHeaders,
    data: repairJobPayload(customer.id, technician.id, { deviceType: "Mixie", problemDescription: "Motor not starting", estimatedCost: 1200 }),
  });
  expect(repairRes.status(), await repairRes.text()).toBe(201);
  const repair = (await repairRes.json()).data;
  expect(repair.status).toBe("not_started");

  // 4. Progress through the full status lifecycle
  for (const status of ["work_in_progress", "pending_to_deliver"]) {
    const res = await request.patch(`repair-jobs/${repair.id}/status`, { headers: adminHeaders, data: { status } });
    expect(res.ok(), await res.text()).toBeTruthy();
  }

  // 5. Generate an invoice linked to the repair job
  const invoiceRes = await request.post("invoices", {
    headers: adminHeaders,
    data: invoicePayload(customer.id, {
      repairJobId: repair.id,
      subtotal: 1200,
      grandTotal: 1200,
      paidAmount: 0,
      items: [{ itemName: "Motor Repair Service", itemType: "SERVICE", quantity: 1, unitPrice: 1200, totalPrice: 1200 }],
    }),
  });
  expect(invoiceRes.status(), await invoiceRes.text()).toBe(201);
  const invoice = (await invoiceRes.json()).data;
  expect(invoice.paymentStatus).toBe("pending");

  // 6. Record full payment -> invoice paid + repair auto-delivered
  const paymentRes = await request.post("payments", {
    headers: adminHeaders,
    data: paymentPayload(invoice.id, { paymentAmount: 1200, paymentMethod: "upi" }),
  });
  expect(paymentRes.status(), await paymentRes.text()).toBe(201);

  const repairAfterPayment = await request.get(`repair-jobs/${repair.id}`, { headers: adminHeaders });
  expect((await repairAfterPayment.json()).data.status).toBe("delivered");

  const invoiceAfterPayment = await request.get(`invoices/${invoice.id}`, { headers: adminHeaders });
  const finalInvoice = (await invoiceAfterPayment.json()).data;
  expect(finalInvoice.paymentStatus).toBe("paid");
  expect(Number(finalInvoice.pendingAmount)).toBe(0);

  // 7. Mark the technician's attendance for a fixed date and verify payroll picks it up
  const attendanceDate = "2020-02-10";
  const bulkRes = await request.post("attendance/bulk", {
    headers: adminHeaders,
    data: { date: attendanceDate, records: [{ employeeId: technician.id, status: "Present" }] },
  });
  expect(bulkRes.status()).toBe(201);

  const payrollRes = await request.get(`attendance/payroll?month=2&year=2020`, { headers: adminHeaders });
  expect(payrollRes.ok()).toBeTruthy();
  const payroll = (await payrollRes.json()).data;
  const payrollEntry = payroll.payroll.find((p: any) => p.employeeId === technician.id);
  expect(payrollEntry).toBeTruthy();
  expect(payrollEntry.presentDays).toBeGreaterThanOrEqual(1);
  expect(payrollEntry.perDaySalary).toBe(800);

  // 8. Confirm the audit trail recorded the key actions along the way
  const auditRes = await request.get("audit?menuName=Repairs", { headers: adminHeaders });
  expect(auditRes.ok()).toBeTruthy();
  const repairAuditLogs = (await auditRes.json()).data;
  expect(repairAuditLogs.some((l: any) => l.referenceId === repair.id)).toBeTruthy();

  const customerAuditRes = await request.get("audit?menuName=Customers&action=CREATE", { headers: adminHeaders });
  const customerAuditLogs = (await customerAuditRes.json()).data;
  expect(customerAuditLogs.some((l: any) => l.referenceId === customer.id)).toBeTruthy();
});
