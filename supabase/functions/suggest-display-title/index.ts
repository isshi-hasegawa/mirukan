import "../_shared/edge-runtime.d.ts";
import {
  handleCorsPreflightRequest,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { suggestDisplayTitle } from "../_shared/gemini.ts";

type SuggestDisplayTitleRequest = {
  title?: string;
  originalTitle?: string | null;
  workType?: "movie" | "series";
};

Deno.serve(async (request) => {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) {
    return corsResponse;
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  const body = await readJsonBody<SuggestDisplayTitleRequest>(request);
  const title = body.title?.trim() ?? "";

  return jsonResponse({
    title: title
      ? await suggestDisplayTitle({
          title,
          originalTitle: body.originalTitle?.trim() || null,
          workType: body.workType === "series" ? "series" : "movie",
        })
      : null,
  });
});
