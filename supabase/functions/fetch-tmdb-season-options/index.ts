import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { fetchTmdbSeasonOptions, type TmdbSearchResult } from "../_shared/tmdb.ts";

type FetchTmdbSeasonOptionsRequest = {
  result?: TmdbSearchResult;
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
    const body = await readJsonBody<FetchTmdbSeasonOptionsRequest>(request);

    if (!body.result) {
      return badRequestResponse("result is required");
    }

    return jsonResponse(await fetchTmdbSeasonOptions(body.result));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
