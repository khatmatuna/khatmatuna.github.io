// ختمتنا — offline support, written by hand.
// The site's pages come from the network first (so updates show) and are kept for when there is no internet.
// Mushaf pages, tafsir and fonts are kept after the first visit and served from the device.
// Recitations and the database are never cached here.
const DATA = "kt-data-v2"; // public/pages, public/tafsir, public/fonts, public/icons: change the name whenever they change
const APP = "kt-app-112d074a-202611280318"; // the site itself: a new name on every deploy (written by scripts/publish.sh)
const isData = (path) => /\/(pages|tafsir|fonts|icons)\//.test(path);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== DATA && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const keep = (name, req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(name).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // audio, database: straight to the network

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => keep(APP, req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match(self.registration.scope))),
    );
    return;
  }
  const name = isData(url.pathname) ? DATA : APP;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(name, req, res))));
});
