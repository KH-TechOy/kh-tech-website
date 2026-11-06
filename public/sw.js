const CACHE = "kh-tech-shell-website2-__BUILD_REVISION__";
const BUILD_PRECACHE = /* BUILD_PRECACHE */ [];
const SHELL = [
  "./",
  "./report/",
  "./manifest.webmanifest",
  "./brand/kh-tech-logo.png",
  "./brand/kh-tech-icon.png",
  "./brand/icon-192.png",
  "./brand/icon-512.png",
  ...BUILD_PRECACHE,
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => key.startsWith("kh-tech-shell-") && key !== CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;
  const relative = url.pathname.slice(scopePath.length);
  const staticAsset =
    /^(?:assets\/|brand\/|game2\/|manifest\.webmanifest$|icon\.svg$)/.test(
      relative,
    );
  const publicNavigation =
    request.mode === "navigate" &&
    /^(?:|report\/?|peli\/?|palvelut\/?|yritys\/?|yhteystiedot\/?|tietosuoja\/?)$/.test(
      relative,
    );
  if (!staticAsset && !publicNavigation) return;
  const remember = async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  };
  if (publicNavigation) {
    event.respondWith(
      fetch(request)
        .then(remember)
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const scope = new URL(self.registration.scope);
          if (
            url.pathname === scope.pathname + "report/" ||
            url.pathname === scope.pathname + "report"
          )
            return (
              (await caches.match(new URL("report/", scope).href)) ||
              Response.error()
            );
          return new Response(
            '<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>KH-Tech – ei verkkoyhteyttä</title><body style="font:16px sans-serif;padding:32px"><h1>Verkkoyhteys puuttuu.</h1><p>Avaa aiemmin käyttämäsi sivu tai yhdistä verkkoon.</p></body></html>',
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }),
    );
    // Public static files do not vary by credentials or Origin. Precache requests
    // lack the Origin header sent by crossorigin module/style tags in the page.
  } else
    event.respondWith(
      caches
        .match(request, { ignoreVary: true })
        .then((cached) => cached || fetch(request).then(remember)),
    );
});
