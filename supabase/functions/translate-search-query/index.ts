import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { translateSearchQuery } from "../_shared/gemini.ts";

type TranslateSearchQueryRequest = {
  query?: string;
};

Deno.serve(async (request) => {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) {
    return corsResponse;
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  const body = await readJsonBody<TranslateSearchQueryRequest>(request);
  const query = body.query?.trim();

  if (!query) {
    return badRequestResponse("query is required");
  }

  return jsonResponse({ query: await translateSearchQuery(query) });
});
