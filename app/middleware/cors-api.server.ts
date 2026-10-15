import { type MiddlewareFunction } from "react-router";

const EXPOSED_HEADERS = "content-disposition";

function requestedMethod(request: Request) {
  return (request.headers.get("access-control-request-method") ?? request.method).toUpperCase();
}

function allowedHeaders(request: Request) {
  const headers = new Set(["authorization"]);
  const requested = request.headers.get("access-control-request-headers");

  if (requested) headers.add(requested.toLowerCase());

  return [...headers].join(", ");
}

export function applyApiCorsHeaders(request: Request, response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", `${requestedMethod(request)}, OPTIONS`);
  response.headers.set("Access-Control-Allow-Headers", allowedHeaders(request));
  response.headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  response.headers.set("Access-Control-Max-Age", "600");

  return response;
}

/**
 * Preserve the CORS contract of the legacy API for every /api response,
 * including errors. Preflight must finish before authentication/ToS checks.
 */
export const corsApiMiddleware: MiddlewareFunction<Response> = async ({ request }, next) => {
  if (request.method === "OPTIONS") {
    return applyApiCorsHeaders(request, new Response(null, { status: 204 }));
  }

  try {
    return applyApiCorsHeaders(request, await next());
  } catch (error) {
    if (error instanceof Response) {
      throw applyApiCorsHeaders(request, error);
    }

    throw error;
  }
};
