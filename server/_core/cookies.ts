// Helpers de cookie para Netlify Functions (sem Express)

export function buildSetCookieHeader(name: string, value: string, maxAge?: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=None",
    "Secure",
  ];
  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`);
  }
  return parts.join("; ");
}

export function buildClearCookieHeader(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`;
}
