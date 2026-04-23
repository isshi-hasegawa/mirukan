import type { IncomingMessage, ServerResponse } from "node:http";
import { corsHeaders } from "./constants.ts";

export function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, {
    "content-type": "application/json",
    ...corsHeaders,
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

export function noContent(
  res: ServerResponse,
  status = 204,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, {
    ...corsHeaders,
    ...extraHeaders,
  });
  res.end();
}

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function buildContentRange(length: number) {
  return `0-${Math.max(length - 1, 0)}/${length}`;
}
