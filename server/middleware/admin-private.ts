/** Defense in depth: login HTML as well as API responses are never indexed/cached. */
export default async function adminPrivacy(
  event: { url: URL },
  next: () => unknown | Promise<unknown>,
) {
  const result = await next();
  if (
    (event.url.pathname === "/admin" ||
      event.url.pathname.startsWith("/admin/") ||
      event.url.pathname.startsWith("/api/admin/")) &&
    result instanceof Response
  ) {
    const headers = new Headers(result.headers);
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("cache-control", "no-store");
    headers.set("referrer-policy", "same-origin");
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }
  return result;
}
