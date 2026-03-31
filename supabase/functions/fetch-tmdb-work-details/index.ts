import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { fetchTmdbWorkDetails, type TmdbSelectionTarget } from "../_shared/tmdb.ts";

type FetchTmdbWorkDetailsRequest = {
  target?: TmdbSelectionTarget;
};

Deno.serve(async (request) => {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) {
    return corsResponse;
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    const body = await readJsonBody<FetchTmdbWorkDetailsRequest>(request);

    if (!body.target) {
      return badRequestResponse("target is required");
    }

    return jsonResponse(await fetchTmdbWorkDetails(body.target));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
