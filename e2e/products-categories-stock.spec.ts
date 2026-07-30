import { test, expect } from "@playwright/test";
import { authHeader, loginAs } from "./utils/api-client";
import { stockMovementPayload } from "./utils/factories";
import { createCategory, createProduct } from "./utils/fixtures";

test.describe("categories", () => {
  test("admin can create, update, and delete a category", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);

    const category = await createCategory(request, accessToken);

    const updateRes = await request.put(`categories/${category.id}`, { headers, data: { name: "Updated Category" } });
    expect(updateRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(`categories/${category.id}`, { headers });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("technician cannot create a category", async ({ request }) => {
    const { accessToken } = await loginAs(request, "TECHNICIAN");
    const res = await request.post("categories", { headers: authHeader(accessToken), data: { name: "Blocked" } });
    expect(res.status()).toBe(403);
  });

  test("PUT/DELETE on a non-existent category id both return 404 'Category not found'", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const putRes = await request.put("categories/does-not-exist", { headers, data: { name: "Ghost" } });
    expect(putRes.status()).toBe(404);
    expect((await putRes.json()).message).toBe("Category not found");

    const deleteRes = await request.delete("categories/does-not-exist", { headers });
    expect(deleteRes.status()).toBe(404);
  });

  test("deleting a category that still has products assigned currently 500s (no FK guard, unlike product delete)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    await createProduct(request, accessToken, category.id);

    // Documents current behavior: Category has no manual delete guard (unlike
    // Product, which checks for invoice references first), so this hits the
    // DB's referential-action restriction raw and 500s rather than a clean 400.
    const res = await request.delete(`categories/${category.id}`, { headers });
    expect(res.status()).toBe(500);
  });
});

test.describe("products", () => {
  test("admin can create a product and see it in low-stock when under minimum", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);

    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 2, minimumStock: 10 });
    expect(product.productCode).toMatch(/^PROD-\d{4}$/);

    const lowStockRes = await request.get("products/low-stock", { headers });
    expect(lowStockRes.ok()).toBeTruthy();
    const lowStock = (await lowStockRes.json()).data;
    expect(lowStock.some((p: any) => p.id === product.id)).toBeTruthy();
  });

  test("technician cannot create a product", async ({ request }) => {
    const { accessToken } = await loginAs(request, "TECHNICIAN");
    const res = await request.post("products", {
      headers: authHeader(accessToken),
      data: { categoryId: "00000000-0000-0000-0000-000000000000", name: "Blocked", purchasePrice: 1, sellingPrice: 2, stockQuantity: 1, minimumStock: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("GET/PUT/DELETE on a non-existent product id all return 404 'Product not found'", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const getRes = await request.get("products/does-not-exist", { headers });
    expect(getRes.status()).toBe(404);
    expect((await getRes.json()).message).toBe("Product not found");

    const putRes = await request.put("products/does-not-exist", { headers, data: { name: "Ghost" } });
    expect(putRes.status()).toBe(404);

    const deleteRes = await request.delete("products/does-not-exist", { headers });
    expect(deleteRes.status()).toBe(404);
  });

  test("list search matches name/brand/productCode/description/category/shelf/row", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const marker = `ShelfMark${Date.now()}`;
    const product = await createProduct(request, accessToken, category.id, { shelf: marker });

    const res = await request.get(`products?all=true&search=${encodeURIComponent(marker)}`, { headers });
    const results = (await res.json()).data;
    expect(results.some((p: any) => p.id === product.id)).toBeTruthy();
  });

  test("list categoryId filter only returns products in that category", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const categoryA = await createCategory(request, accessToken);
    const categoryB = await createCategory(request, accessToken);
    const productA = await createProduct(request, accessToken, categoryA.id);
    await createProduct(request, accessToken, categoryB.id);

    const res = await request.get(`products?all=true&categoryId=${categoryA.id}`, { headers });
    const results = (await res.json()).data;
    expect(results.every((p: any) => p.categoryId === categoryA.id)).toBeTruthy();
    expect(results.some((p: any) => p.id === productA.id)).toBeTruthy();
  });

  test("deleting a product already billed on an invoice is rejected with a clean 400", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 20, sellingPrice: 50 });
    const customerRes = await request.post("customers", {
      headers,
      data: { fullName: "Delete Guard Customer", phoneNumber: `9${Date.now()}`.slice(0, 10) },
    });
    const customer = (await customerRes.json()).data;

    const invoiceRes = await request.post("invoices", {
      headers,
      data: {
        customerId: customer.id,
        subtotal: 50,
        discount: 0,
        tax: 0,
        grandTotal: 50,
        items: [{ productId: product.id, itemName: product.name, itemType: "PRODUCT", quantity: 1, unitPrice: 50, totalPrice: 50 }],
      },
    });
    expect(invoiceRes.status(), await invoiceRes.text()).toBe(201);

    const deleteRes = await request.delete(`products/${product.id}`, { headers });
    expect(deleteRes.status()).toBe(400);
    expect((await deleteRes.json()).message).toMatch(/already been billed/i);
  });

  test("deleting a product with only stock-movement history (no invoices) succeeds and clears that history", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 10 });

    await request.post("stock-movements", { headers, data: { productId: product.id, movementType: "in", quantity: 5 } });

    const deleteRes = await request.delete(`products/${product.id}`, { headers });
    expect(deleteRes.status(), await deleteRes.text()).toBe(200);

    const getRes = await request.get(`products/${product.id}`, { headers });
    expect(getRes.status()).toBe(404);
  });
});

test.describe("stock movements", () => {
  test("stock IN increases quantity, OUT decreases it, adjustment applies signed delta", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 10 });

    const inRes = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "in", quantity: 5 }),
    });
    expect(inRes.status(), await inRes.text()).toBe(201);
    expect((await inRes.json()).data.currentStock).toBe(15);

    const outRes = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "out", quantity: 3 }),
    });
    expect(outRes.ok()).toBeTruthy();
    expect((await outRes.json()).data.currentStock).toBe(12);

    const adjustRes = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "adjustment", quantity: -2 }),
    });
    expect(adjustRes.ok()).toBeTruthy();
    expect((await adjustRes.json()).data.currentStock).toBe(10);

    const productRes = await request.get(`products/${product.id}`, { headers });
    expect((await productRes.json()).data.stockQuantity).toBe(10);
  });

  test("rejects an adjustment with quantity 0", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id);

    const res = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "adjustment", quantity: 0 }),
    });
    expect(res.status()).toBe(400);
  });

  test("rejects OUT that would take stock negative", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 2 });

    const res = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "out", quantity: 5 }),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/insufficient stock/i);
  });

  test("staff can record stock movements", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const category = await createCategory(request, admin.accessToken);
    const product = await createProduct(request, admin.accessToken, category.id);

    const { accessToken: staffToken } = await loginAs(request, "STAFF");
    const res = await request.post("stock-movements", {
      headers: authHeader(staffToken),
      data: stockMovementPayload(product.id),
    });
    expect(res.status(), await res.text()).toBe(201);
  });

  test("technician cannot record stock movements", async ({ request }) => {
    const admin = await loginAs(request, "ADMIN");
    const category = await createCategory(request, admin.accessToken);
    const product = await createProduct(request, admin.accessToken, category.id);

    const { accessToken: techToken } = await loginAs(request, "TECHNICIAN");
    const res = await request.post("stock-movements", { headers: authHeader(techToken), data: stockMovementPayload(product.id) });
    expect(res.status()).toBe(403);
  });

  test("rejects a movement referencing a non-existent product", async ({ request }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const res = await request.post("stock-movements", {
      headers: authHeader(accessToken),
      data: stockMovementPayload("00000000-0000-0000-0000-000000000000"),
    });
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBe("Product not found");
  });

  test("an adjustment is not floored at zero — it can drive stock negative (unlike OUT, which is guarded)", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const product = await createProduct(request, accessToken, category.id, { stockQuantity: 3 });

    const res = await request.post("stock-movements", {
      headers,
      data: stockMovementPayload(product.id, { movementType: "adjustment", quantity: -10 }),
    });
    expect(res.status(), await res.text()).toBe(201);
    expect((await res.json()).data.currentStock).toBe(-7);
  });

  test("the list endpoint's productId query param is silently ignored — it always returns the full date-bounded list", async ({
    request,
  }) => {
    const { accessToken } = await loginAs(request, "ADMIN");
    const headers = authHeader(accessToken);
    const category = await createCategory(request, accessToken);
    const productA = await createProduct(request, accessToken, category.id, { stockQuantity: 10 });
    const productB = await createProduct(request, accessToken, category.id, { stockQuantity: 10 });

    const movementA = (
      await (
        await request.post("stock-movements", { headers, data: stockMovementPayload(productA.id, { movementType: "in", quantity: 1 }) })
      ).json()
    ).data;
    const movementB = (
      await (
        await request.post("stock-movements", { headers, data: stockMovementPayload(productB.id, { movementType: "in", quantity: 1 }) })
      ).json()
    ).data;

    const res = await request.get(`stock-movements?all=true&productId=${productA.id}`, { headers });
    const results = (await res.json()).data;
    // Both show up despite filtering by productA's id — productId isn't a real filter.
    expect(results.some((m: any) => m.id === movementA.id)).toBeTruthy();
    expect(results.some((m: any) => m.id === movementB.id)).toBeTruthy();
  });
});
