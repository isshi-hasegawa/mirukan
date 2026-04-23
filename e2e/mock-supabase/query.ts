import type { IncomingMessage, ServerResponse } from "node:http";
import { buildContentRange, json, noContent } from "./http.ts";

function isNullable(value: unknown) {
  return value === null || value === undefined;
}

function compareFieldValues(leftValue: unknown, rightValue: unknown, direction: "asc" | "desc") {
  if (leftValue === rightValue) {
    return 0;
  }
  if (isNullable(leftValue)) {
    return direction === "desc" ? 1 : -1;
  }
  if (isNullable(rightValue)) {
    return direction === "desc" ? -1 : 1;
  }
  if (leftValue < rightValue) {
    return direction === "desc" ? 1 : -1;
  }
  return direction === "desc" ? -1 : 1;
}

export function matchesFilters(row: Record<string, unknown>, url: URL) {
  for (const [key, value] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) {
      continue;
    }
    if (!value.startsWith("eq.")) {
      continue;
    }
    if (String(row[key]) !== value.slice(3)) {
      return false;
    }
  }

  return true;
}

function selectedFields(selectValue: string | null) {
  return (selectValue ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field && !field.includes("("));
}

export function pickSelectedFields<T extends Record<string, unknown>>(
  row: T,
  selectValue: string | null,
) {
  const fields = selectedFields(selectValue);
  if (fields.length === 0) {
    return row;
  }

  return Object.fromEntries(
    fields.filter((field) => field in row).map((field) => [field, row[field]]),
  );
}

export function sortRows<T extends Record<string, unknown>>(rows: T[], url: URL) {
  const orderParams = url.searchParams.getAll("order");
  if (orderParams.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const orderParam of orderParams) {
      const [column, rawDirection = "asc"] = orderParam.split(".");
      const direction = rawDirection === "desc" ? "desc" : "asc";
      const comparison = compareFieldValues(left[column], right[column], direction);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

function buildJsonResponseRows(
  request: IncomingMessage,
  rows: Record<string, unknown>[],
  status = 200,
) {
  const accept = request.headers.accept ?? "";
  if (accept.includes("application/vnd.pgrst.object+json")) {
    if (rows.length !== 1) {
      return {
        status: 406,
        body: { message: "JSON object requested, multiple (or no) rows returned" },
      };
    }

    return { status, body: rows[0] };
  }

  return { status, body: rows };
}

function shouldReturnRepresentation(request: IncomingMessage) {
  return (request.headers.prefer ?? "").includes("return=representation");
}

export function respondWithRows(
  req: IncomingMessage,
  res: ServerResponse,
  rows: Record<string, unknown>[],
  status = 200,
) {
  const response = buildJsonResponseRows(req, rows, status);
  json(res, response.status, response.body, {
    "content-range": buildContentRange(rows.length),
  });
}

export function respondWithRepresentation(
  req: IncomingMessage,
  res: ServerResponse,
  rows: Record<string, unknown>[],
  created = false,
) {
  if (!shouldReturnRepresentation(req)) {
    noContent(res, created ? 201 : 204);
    return;
  }

  const response = buildJsonResponseRows(req, rows, created ? 201 : 200);
  json(res, response.status, response.body);
}
