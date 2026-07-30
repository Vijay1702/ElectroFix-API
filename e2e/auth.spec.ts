import { test, expect } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../prisma/e2e-fixtures";
import { authHeader, login } from "./utils/api-client";

test.describe("auth", () => {
  test("login succeeds with correct credentials and returns tokens + user", async ({ request }) => {
    const result = await login(request, E2E_USERS.ADMIN.email);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toMatchObject({
      email: E2E_USERS.ADMIN.email,
      fullName: E2E_USERS.ADMIN.fullName,
      role: "ADMIN",
    });
  });

  test("login fails with wrong password", async ({ request }) => {
    const res = await request.post("auth/login", {
      data: { email: E2E_USERS.ADMIN.email, password: "wrong-password" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid email or password/i);
  });

  test("login fails for unknown email", async ({ request }) => {
    const res = await request.post("auth/login", {
      data: { email: "nobody@e2e.test", password: E2E_PASSWORD },
    });
    expect(res.status()).toBe(401);
  });

  test("login rejects a password shorter than 6 chars at the validator", async ({ request }) => {
    const res = await request.post("auth/login", {
      data: { email: E2E_USERS.ADMIN.email, password: "123" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errors?.length).toBeGreaterThan(0);
  });

  test("GET /auth/profile requires a token", async ({ request }) => {
    const res = await request.get("auth/profile");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/token is required/i);
  });

  test("GET /auth/profile returns the caller's profile without a password field", async ({ request }) => {
    const { accessToken, user } = await login(request, E2E_USERS.ADMIN.email);
    const res = await request.get("auth/profile", { headers: authHeader(accessToken) });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.id).toBe(user.id);
    expect(body.data.role).toBe("ADMIN");
    expect(body.data.password).toBeUndefined();
  });

  test("a malformed bearer token is rejected", async ({ request }) => {
    const res = await request.get("auth/profile", { headers: { Authorization: "Bearer not-a-real-token" } });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/invalid token/i);
  });

  test("refresh-token issues a new access token", async ({ request }) => {
    const { refreshToken } = await login(request, E2E_USERS.ADMIN.email);
    const res = await request.post("auth/refresh-token", { data: { refreshToken } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.accessToken).toBeTruthy();
  });

  test("an access token cannot be used as a refresh token (different secret)", async ({ request }) => {
    const { accessToken } = await login(request, E2E_USERS.ADMIN.email);
    const res = await request.post("auth/refresh-token", { data: { refreshToken: accessToken } });
    expect(res.status()).toBe(401);
  });

  test("logout succeeds but does not invalidate the access token (documents current behavior)", async ({ request }) => {
    const { accessToken } = await login(request, E2E_USERS.ADMIN.email);

    const logoutRes = await request.post("auth/logout", { headers: authHeader(accessToken) });
    expect(logoutRes.ok()).toBeTruthy();

    // Known gap: there is no token blacklist, so the "logged out" token still works.
    const profileRes = await request.get("auth/profile", { headers: authHeader(accessToken) });
    expect(profileRes.ok()).toBeTruthy();
  });
});
