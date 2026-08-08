export const HTML_SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.includes(".") && !url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
      return Response.redirect(url.toString(), 308);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return secureHtml(response);

    const fallbackRequest = new Request(new URL("/404.html", request.url), {
      method: "GET",
      headers: request.headers
    });
    const fallback = await env.ASSETS.fetch(fallbackRequest);
    if (!fallback.ok) return secureHtml(response);

    return secureHtml(new Response(request.method === "HEAD" ? null : fallback.body, {
      status: 404,
      headers: fallback.headers
    }));
  }
};

function secureHtml(response) {
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(HTML_SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
