import { createServer } from "node:http";
import { handleAuth } from "./mock-supabase/auth.ts";
import { HOST, PORT } from "./mock-supabase/constants.ts";
import { handleFunctions } from "./mock-supabase/functions.ts";
import { json, noContent } from "./mock-supabase/http.ts";
import { handleRest } from "./mock-supabase/rest.ts";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") {
    noContent(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (await handleAuth(req, res, url)) {
    return;
  }

  if (await handleRest(req, res, url)) {
    return;
  }

  if (await handleFunctions(req, res, url)) {
    return;
  }

  json(res, 404, { error: `Not found: ${req.method} ${url.pathname}` });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock Supabase server listening on http://${HOST}:${PORT}`);
});
