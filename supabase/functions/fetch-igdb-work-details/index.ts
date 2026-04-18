import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { fetchIgdbWorkDetails, getDefaultIgdbCallContext } from "../_shared/igdb.ts";

type FetchIgdbWorkDetailsRequest = {
  igdbId?: number;
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
    const body = await readJsonBody<FetchIgdbWorkDetailsRequest>(request);
    if (typeof body.igdbId !== "number" || !Number.isFinite(body.igdbId)) {
      return badRequestResponse("igdbId is required");
    }

    return jsonResponse(await fetchIgdbWorkDetails(body.igdbId, getDefaultIgdbCallContext()));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
