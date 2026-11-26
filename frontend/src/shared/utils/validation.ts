const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^\p{L}[\p{L}\s'-]*$/u;
const PHONE_RE = /^\+?\d{10,15}$/;

export const normalizePhone = (v: string) => v.replace(/[\s()-]/g, '');

export function validateEmail(v: string): string | undefined {
  const s = v.trim();
  if (!s) return 'Enter your email address.';
  if (!EMAIL_RE.test(s)) return 'Enter a valid email address, e.g. name@example.com.';
  return undefined;
}

export function validateName(v: string, label: string): string | undefined {
  const s = v.trim();
  if (!s) return `Enter your ${label}.`;
  if (s.length > 50) return `Your ${label} must be at most 50 characters.`;
  if (!NAME_RE.test(s)) return `Your ${label} can contain only letters, spaces, hyphens and apostrophes.`;
  return undefined;
}

export function validatePhone(v: string): string | undefined {
  const s = normalizePhone(v);
  if (!s) return 'Enter your phone number.';
  if (!PHONE_RE.test(s)) return 'Enter a valid phone number, e.g. +380501234567.';
  return undefined;
}

export function validateNewPassword(v: string): string | undefined {
  if (!v) return 'Create a password.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (v.length > 128) return 'Password must be at most 128 characters.';
  return undefined;
}

export function validateRequiredPassword(v: string): string | undefined {
  return v ? undefined : 'Enter your password.';
}
