import { timingSafeEqual } from "node:crypto";

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

export const TRUSTED_AUTH_ROLE_HEADER = "x-demogym-auth-role";

export type BasicAuthRole = "admin" | "sales";

const ADMIN_ONLY_API_PREFIXES = [
  "/api/products",
  "/api/ingredients",
  "/api/sales/history",
  "/api/sales/reports",
  "/api/closure-incidents",
] as const;

const ADMIN_ONLY_PAGE_PREFIXES = ["/reportes", "/incidencias-cierres"] as const;
const CASH_CLOSURE_VALIDATION_PATH =
  /^\/api\/cash-closures\/[^/]+\/validate$/;
const CASH_CLOSURE_REVISIONS_PATH =
  /^\/api\/cash-closures\/[^/]+\/revisions$/;
const SALE_VOID_PATH = /^\/api\/sales\/[^/]+\/void$/;

const PROFILE_SWITCH_PATH = "/api/auth/switch-profile";
const PROFILE_SWITCH_COOKIE = "demogymcafe_profile_switch";

export function isBasicAuthConfigured(
  expectedSha256: string | undefined,
): expectedSha256 is string {
  return Boolean(expectedSha256 && SHA256_HEX_PATTERN.test(expectedSha256.trim()));
}

export function areBasicAuthRolesConfigured(
  adminSha256: string | undefined,
  salesSha256: string | undefined,
): boolean {
  if (
    !isBasicAuthConfigured(adminSha256) ||
    !isBasicAuthConfigured(salesSha256)
  ) {
    return false;
  }

  return adminSha256.trim().toLowerCase() !== salesSha256.trim().toLowerCase();
}

function decodeHex(value: string): Uint8Array | null {
  if (!SHA256_HEX_PATTERN.test(value)) return null;

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function isBasicAuthenticated(
  request: Request,
  expectedSha256: string | undefined,
): Promise<boolean> {
  if (!isBasicAuthConfigured(expectedSha256)) return false;
  const expected = decodeHex(expectedSha256.trim());
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return false;

  let credentials: string;
  try {
    credentials = atob(match[1]);
  } catch {
    return false;
  }

  const credentialBytes = Uint8Array.from(credentials, (character) =>
    character.charCodeAt(0),
  );

  const digest = await crypto.subtle.digest("SHA-256", credentialBytes);
  return constantTimeEqual(new Uint8Array(digest), expected);
}

export async function authenticateBasicRole(
  request: Request,
  adminSha256: string | undefined,
  salesSha256: string | undefined,
): Promise<BasicAuthRole | null> {
  if (!areBasicAuthRolesConfigured(adminSha256, salesSha256)) return null;

  const adminDigest = decodeHex(adminSha256!.trim());
  const salesDigest = decodeHex(salesSha256!.trim());
  if (!adminDigest || !salesDigest) return null;

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return null;

  let credentials: string;
  try {
    credentials = atob(match[1]);
  } catch {
    return null;
  }

  const credentialBytes = Uint8Array.from(credentials, (character) =>
    character.charCodeAt(0),
  );
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", credentialBytes),
  );

  // Compare against both configured roles for every valid credential. Do not
  // reveal which stored digest was closer to a match through an early return.
  const isAdmin = constantTimeEqual(digest, adminDigest);
  const isSales = constantTimeEqual(digest, salesDigest);

  if (isAdmin) return "admin";
  if (isSales) return "sales";
  return null;
}

export function withTrustedAuthRole(
  request: Request,
  role: BasicAuthRole,
): Request {
  const headers = new Headers(request.headers);
  headers.delete(TRUSTED_AUTH_ROLE_HEADER);
  headers.set(TRUSTED_AUTH_ROLE_HEADER, role);
  return new Request(request, { headers });
}

export function isAdminOnlyApiPath(pathname: string): boolean {
  return (
    CASH_CLOSURE_VALIDATION_PATH.test(pathname) ||
    CASH_CLOSURE_REVISIONS_PATH.test(pathname) ||
    SALE_VOID_PATH.test(pathname) ||
    ADMIN_ONLY_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export function isAdminOnlyPagePath(pathname: string): boolean {
  return ADMIN_ONLY_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProfileSwitchPath(pathname: string): boolean {
  return pathname === PROFILE_SWITCH_PATH;
}

function hasProfileSwitchCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${PROFILE_SWITCH_COOKIE}=1`));
}

export function shouldCompleteProfileSwitch(request: Request): boolean {
  return hasProfileSwitchCookie(request);
}

export function profileSwitchChallenge(): Response {
  return new Response("Ingresa el perfil que quieres usar.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Set-Cookie": `${PROFILE_SWITCH_COOKIE}=1; Max-Age=60; Path=${PROFILE_SWITCH_PATH}; HttpOnly; SameSite=Strict; Secure`,
      "WWW-Authenticate": 'Basic realm="Demo Gym Ops", charset="UTF-8"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function profileSwitchRedirect(request: Request): Response {
  const url = new URL(request.url);
  const requestedReturnTo = url.searchParams.get("returnTo") ?? "/";
  let location = "/";

  try {
    const target = new URL(requestedReturnTo, url.origin);
    if (
      target.origin === url.origin &&
      !isProfileSwitchPath(target.pathname)
    ) {
      location = `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    location = "/";
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      Location: location,
      "Set-Cookie": `${PROFILE_SWITCH_COOKIE}=; Max-Age=0; Path=${PROFILE_SWITCH_PATH}; HttpOnly; SameSite=Strict; Secure`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function hasTrustedMutationOrigin(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return true;
  }

  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function basicAuthChallenge(): Response {
  return new Response("Acceso restringido.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="Demo Gym Ops", charset="UTF-8"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function authConfigurationError(): Response {
  return new Response("Acceso temporalmente no disponible.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function untrustedOriginResponse(): Response {
  return new Response("Origen de solicitud no permitido.", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function forbiddenRoleResponse(): Response {
  return new Response("Tu perfil no tiene permisos de administración.", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
