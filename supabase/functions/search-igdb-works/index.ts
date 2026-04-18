import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { getDefaultIgdbCallContext, searchIgdbWorks } from "../_shared/igdb.ts";

type SearchIgdbWorksRequest = {
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
    const body = await readJsonBody<SearchIgdbWorksRequest>(request);
    const query = body.query?.trim();

    if (!query) {
      return badRequestResponse("query is required");
    }

    return jsonResponse(await searchIgdbWorks(query, getDefaultIgdbCallContext()));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
