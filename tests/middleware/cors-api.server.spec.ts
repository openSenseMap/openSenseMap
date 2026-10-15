import { applyApiCorsHeaders, corsApiMiddleware } from "~/middleware/cors-api.server";

describe("legacy API CORS middleware", () => {
  it("adds the legacy CORS headers to ordinary responses", async () => {
    const request = new Request("https://example.test/api/boxes");
    const response = (await corsApiMiddleware({ request } as never, async () =>
      Response.json({ ok: true }),
    )) as Response;

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toContain("authorization");
    expect(response.headers.get("access-control-expose-headers")).toContain("content-disposition");
  });

  it("answers preflight without invoking downstream middleware", async () => {
    const request = new Request("https://example.test/api/boxes", {
      method: "OPTIONS",
      headers: { "Access-Control-Request-Method": "POST" },
    });
    const next = vi.fn(async () => new Response(null, { status: 500 }));

    const response = (await corsApiMiddleware({ request } as never, next)) as Response;

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
  });

  it("can add headers to an existing error response", () => {
    const request = new Request("https://example.test/api/boxes");
    const response = applyApiCorsHeaders(request, Response.json({ error: true }, { status: 428 }));

    expect(response.status).toBe(428);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});
