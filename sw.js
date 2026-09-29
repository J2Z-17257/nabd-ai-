/* عامل الخدمة — يجعل نبض يعمل بلا إنترنت بعد أول فتح */
const V = "nabd-v2";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V)
      // addAll يفشل كاملاً لو سقط ملف واحد، لذا نخزّن كلاً على حدة
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // صفحات التصفح: الشبكة أولاً ثم الذاكرة عند الانقطاع
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(V).then(c => c.put("./index.html", copy));
        return r;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // الخطوط الخارجية: الذاكرة أولاً ثم الشبكة، وتُخزَّن بعد أول نجاح
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copy = r.clone();
        caches.open(V).then(c => c.put(req, copy));
        return r;
      }).catch(() => hit))
    );
    return;
  }

  // بقية ملفات الموقع: الذاكرة أولاً
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      const copy = r.clone();
      caches.open(V).then(c => c.put(req, copy));
      return r;
    }))
  );
});
