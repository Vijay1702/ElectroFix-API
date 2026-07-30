import { APIRequestContext, expect } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../prisma/e2e-fixtures";

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string };
};

export async function login(
  request: APIRequestContext,
  email: string,
  password: string = E2E_PASSWORD
): Promise<LoginResult> {
  const res = await request.post("auth/login", { data: { email, password } });
  expect(res.ok(), `login as ${email} failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return body.data as LoginResult;
}

export async function loginAs(
  request: APIRequestContext,
  role: keyof typeof E2E_USERS
): Promise<LoginResult> {
  return login(request, E2E_USERS[role].email, E2E_PASSWORD);
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
