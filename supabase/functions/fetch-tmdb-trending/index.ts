import "../_shared/edge-runtime.d.ts";
import {
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
} from "../_shared/http.ts";
import { fetchTmdbTrending } from "../_shared/tmdb.ts";

Deno.serve(async (request) => {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) {
    return corsResponse;
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    return jsonResponse(await fetchTmdbTrending());
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
