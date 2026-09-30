/**
 * Accepts only in-app paths (`/checkout`, `/orders?x=1`). Anything that could leave the app or
 * escape the route (`//evil.com`, `https://…`, `javascript:`) becomes `null`.
 */
export function safeRedirect(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('://') || value.includes('\\')) return null;
  return value;
}
