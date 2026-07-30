import { APIRequestContext, expect } from "@playwright/test";
import { authHeader, loginAs } from "./api-client";
import { categoryPayload, customerPayload, productPayload } from "./factories";

// Small helpers for specs that need a real customer/technician/product/category
// to hang their own test off — avoids every spec re-deriving admin tokens + ids.

export async function createCustomer(request: APIRequestContext, adminToken: string, overrides = {}) {
  const res = await request.post("customers", {
    headers: authHeader(adminToken),
    data: customerPayload(overrides),
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).data;
}

export async function createCategory(request: APIRequestContext, adminToken: string, overrides = {}) {
  const res = await request.post("categories", {
    headers: authHeader(adminToken),
    data: categoryPayload(overrides),
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).data;
}

export async function createProduct(
  request: APIRequestContext,
  adminToken: string,
  categoryId: string,
  overrides = {}
) {
  const res = await request.post("products", {
    headers: authHeader(adminToken),
    data: productPayload(categoryId, overrides),
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).data;
}

export async function getTechnicianId(request: APIRequestContext): Promise<string> {
  const { user } = await loginAs(request, "TECHNICIAN");
  return user.id;
}
