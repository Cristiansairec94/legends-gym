import { Employee, UserRole } from '../types';

const INTERNAL_PEPPER = 'LEYENDS_GYM_ERP_2026_CORE_SHIELD_#9812';

/**
 * Generates a deterministic 128-bit hex hash with salt & pepper
 * so passwords/PINs are never stored in plain text in localStorage/sessionStorage.
 */
export function hashSecret(plainText: string): string {
  if (!plainText) return '';
  if (plainText.startsWith('lg_hash$')) return plainText;

  const input = `${INTERNAL_PEPPER}::${plainText.trim()}::SALT_V2`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x811c9dc5 ^ input.length;
  let h4 = 0x1b873593 ^ input.length;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 16777619);
    h4 = Math.imul(h4 ^ ch, 3432918353);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex = [h1, h2, h3, h4]
    .map((h) => (h >>> 0).toString(16).padStart(8, '0'))
    .join('');

  return `lg_hash$${hex}`;
}

/**
 * Verifies a plain-text password or PIN against a stored hash (or legacy plain value).
 */
export function verifySecret(plainAttempt: string, storedValue?: string): boolean {
  if (!plainAttempt || !storedValue) return false;
  const cleanAttempt = plainAttempt.trim();
  if (storedValue.startsWith('lg_hash$')) {
    return hashSecret(cleanAttempt) === storedValue;
  }
  return cleanAttempt === storedValue;
}

/**
 * Signs session metadata to prevent DevTools (F12) privilege escalation or tampering.
 */
export function signSessionPayload(userId: string, role: UserRole, email: string, token: string): string {
  const payload = `SESSION_SIG::${userId}::${role}::${email.toLowerCase()}::${token}::${INTERNAL_PEPPER}`;
  return hashSecret(payload);
}

export function verifySessionSignature(
  userId: string,
  role: UserRole,
  email: string,
  token: string,
  signature?: string
): boolean {
  if (!signature || !token || !userId || !role) return false;
  const expected = signSessionPayload(userId, role, email, token);
  return expected === signature;
}

/**
 * Validates whether an employee is allowed to log in at the current local time.
 * Unrestricted 24/7 access is enabled for all staff members regardless of schedule.
 */
export function checkEmployeeShiftAllowed(
  _emp: Employee,
  now: Date = new Date()
): { allowed: boolean; message?: string; currentTimeStr: string } {
  const currentTimeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return { allowed: true, currentTimeStr };
}
