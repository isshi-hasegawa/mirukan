import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { fetchOmdbDetails } from "../_shared/omdb.ts";

type FetchOmdbWorkDetailsRequest = {
  imdbId?: string;
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
    const body = await readJsonBody<FetchOmdbWorkDetailsRequest>(request);

    if (!body.imdbId) {
      return badRequestResponse("imdbId is required");
    }

    return jsonResponse(await fetchOmdbDetails(body.imdbId));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
