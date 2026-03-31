import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { searchTmdbWorks } from "../_shared/tmdb.ts";

type SearchTmdbWorksRequest = {
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

  try {
    const body = await readJsonBody<SearchTmdbWorksRequest>(request);
    const query = body.query?.trim();

    if (!query) {
      return badRequestResponse("query is required");
    }

    return jsonResponse(await searchTmdbWorks(query));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
