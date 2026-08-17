// Everline HQ — Custom Domain Proxy
// Doel: bezoekers zien alleen jouw eigen domein (bv. app.everlinehq.nl),
// nooit "delacourt.app.n8n.cloud" — ook niet in de adresbalk.
//
// Werking: elk verzoek naar dit domein wordt onzichtbaar doorgestuurd
// naar de bijbehorende n8n-webhook, en het antwoord (HTML/JSON) komt
// gewoon terug alsof het van dit domein zelf komt.
//
// Uitzondering: /brochure wordt niet doorgestuurd maar rechtstreeks
// vanuit deze server geserveerd (brochure.html staat naast dit bestand).

const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const N8N_BASE = "https://delacourt.app.n8n.cloud/webhook";

// Korte, mooie paden -> echte n8n-webhook-paden.
// Voeg hier gewoon een regel toe zodra je een nieuwe pagina bouwt.
const ROUTES = {
  "/scan": "/de-regie-scan",
  "/bio": "/everlinehq-bio",
  "/pitch": "/everlinehq-pitch",
  "/intake": "/everlinehq-pakket-intake",
  "/scan-lead": "/everlinehq-scan-lead", // interne lead-post, niet voor mensen bedoeld
  "/reis": "/everlinehq-reis",
  "/voorbereiding": "/everlinehq-intake-form",
  "/voorbereiding-lead": "/everlinehq-intake-answers", // interne lead-post, niet voor mensen bedoeld
};

// Statische pagina's die hier zelf staan, niet in n8n.
// Handig voor grote bestanden (foto's) die niet door een n8n-node passen.
const STATIC_PAGES = {
  "/brochure": "brochure.html",
};

for (const [publicPath, fileName] of Object.entries(STATIC_PAGES)) {
  app.get(publicPath, (req, res) => {
    res.sendFile(path.join(__dirname, fileName));
  });
}

for (const [publicPath, n8nPath] of Object.entries(ROUTES)) {
  app.use(
    publicPath,
    createProxyMiddleware({
      target: N8N_BASE,
      changeOrigin: true,
      pathRewrite: () => n8nPath,
      onError: (err, req, res) => {
        console.error("Proxy error:", err.message);
        res.status(502).send("Even geduld — de pagina is tijdelijk niet bereikbaar.");
      },
    })
  );
}

// Simpele statuscheck, handig om te zien of de proxy zelf leeft
app.get("/", (req, res) => {
  const paden = [...Object.keys(STATIC_PAGES), ...Object.keys(ROUTES)];
  res.send("Everline HQ proxy is actief. Beschikbare paden: " + paden.join(", "));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy draait op poort ${PORT}`);
});
