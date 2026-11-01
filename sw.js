// Кэш для работы калькуляторов без интернета. При изменении файлов увеличьте версию.
const CACHE = "poschitay-v19";
const FILES = [
  "./", "index.html", "plitka", "oboi", "laminat", "kraska", "shtukaturka", "beton", "kirpich", "gazobeton", "uteplitel", "ipoteka", "kredit", "vklad", "ndfl", "otpusknye", "bolnichnyy", "nalogovyy-vychet", "alimenty", "samozanyatye", "nalogi-ip-usn", "zhizn-v-cifrah", "nastoyashchaya-cena", "finansovaya-svoboda", "procenty", "obligacii", "dividendy", "zabor", "styazhka", "krovlya", "teplyy-pol", "radiatory", "lestnica", "drova", "basseyn", "gazon", "stoimost-pitomca", "filmy-i-knigi", "brosit-kurit", "kofein", "taksi-ili-mashina", "vladenie-avto", "elektromobil", "zhrebiy", "stoimost-sotrudnika", "refinansirovanie", "picca", "stoimost-rebenka", "shashlyk", "gramm-v-lozhke", "dosrochnoe-pogashenie", "nds", "arenda-ili-ipoteka", "kondicioner", "promille", "shiny", "slozhnyy-procent", "inflyaciya", "kreditnaya-nagruzka", "transportnyy-nalog", "vozrast", "perevod-edinic", "kommunalka", "razdelit-schet", "son", "vozrast-pitomca", "imt", "kalorii", "norma-vody", "beremennost", "rashod-topliva", "stoimost-poezdki", "elektrichestvo", "ploshchad", "dni-mezhdu-datami", "obratnaya-svyaz", "podderzhat",
  "assets/style.css", "assets/app.js", "assets/icon.svg", "assets/icon-180.png", "assets/icon-192.png", "assets/icon-512.png", "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Сначала сеть, при её отсутствии — кэш. Чужие домены (реклама) не трогаем.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
