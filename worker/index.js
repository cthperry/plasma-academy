export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.includes(".") && !url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
      return Response.redirect(url.toString(), 308);
    }
    return env.ASSETS.fetch(request);
  }
};
