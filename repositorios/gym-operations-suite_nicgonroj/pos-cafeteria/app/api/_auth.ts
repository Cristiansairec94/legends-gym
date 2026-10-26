export const AUTH_ROLE_HEADER = "x-demogym-auth-role";

export type AuthRole = "admin" | "sales";

export function getAuthRole(request: Request): AuthRole | null {
  const role = request.headers.get(AUTH_ROLE_HEADER);
  return role === "admin" || role === "sales" ? role : null;
}

export function requireAuthenticatedRole(request: Request): Response | null {
  if (getAuthRole(request) !== null) return null;

  return Response.json(
    { error: "No autenticado." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function requireAdmin(request: Request): Response | null {
  if (getAuthRole(request) === "admin") return null;

  return Response.json(
    { error: "Tu perfil no tiene permisos de administración." },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
