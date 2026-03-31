import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { fetchTmdbSimilar } from "../_shared/tmdb.ts";

type FetchTmdbSimilarRequest = {
  sourceItems?: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>;
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
    const body = await readJsonBody<FetchTmdbSimilarRequest>(request);
    const sourceItems = body.sourceItems;

    if (!Array.isArray(sourceItems)) {
      return badRequestResponse("sourceItems is required");
    }

    return jsonResponse(await fetchTmdbSimilar(sourceItems));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
