export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorJson(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
): Response {
  return json(status, { code, ...extra });
}
