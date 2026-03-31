const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const;

export function handleCorsPreflightRequest(request: Request) {
  if (request.method !== "OPTIONS") {
    return null;
  }

  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function methodNotAllowedResponse() {
  return jsonResponse({ error: "Method not allowed" }, { status: 405 });
}

export function badRequestResponse(message: string) {
  return jsonResponse({ error: message }, { status: 400 });
}

export function internalServerErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return jsonResponse({ error: message }, { status: 500 });
}
