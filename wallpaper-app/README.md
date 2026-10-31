# Innenleben Wallpaper

PWA, die ein Wallpaper „Blick zum Innenleben“ passend zur Auflösung des eigenen Geräts erzeugt.
Gratis gibt es eine Vorschau mit fest eingebranntem Wasserzeichen. Gegen Bezahlung (Stripe) gibt es
die volle Geräteauflösung ohne Wasserzeichen.

> **Die Prompts sind Platzhalter.** `src/prompts.js` enthält eine eigene Interpretation des Themas.
> Die erprobten Prompts aus der Wallpaper-Sitzung müssen dort eingetragen werden. Die Optionen im
> Frontend werden automatisch aus dieser Datei erzeugt.

## Architektur (ausgelegt auf 0 € Betriebskosten)

| Teil | Dienst | Kosten |
|---|---|---|
| Hosting PWA + API | Cloudflare Workers, Free-Plan | 0 € (100.000 Requests/Tag) |
| Bildgenerierung | Workers AI `flux-1-schnell` (Lizenz Apache-2.0) | 0 € im Rahmen von 10.000 Neurons/Tag; auf dem **Free-Plan** schlagen weitere Aufrufe mit einem Fehler fehl, statt Kosten zu verursachen |
| Prompt-Erstellung | Vorlage in `src/prompts.js` | 0 € |
| Prompt-Erstellung (optional) | Claude (`PROMPT_ENGINE=claude`) | **kostenpflichtig**, standardmäßig aus |
| Zuschnitt + Wasserzeichen | Cloudflare Images-Binding | Free-Kontingent – **vor dem Livegang im Dashboard prüfen** (nicht verifiziert) |
| Speicher (Zähler, Originale 48 h) | Workers KV, Free | 0 € (1.000 Schreibvorgänge/Tag) |
| Bezahlung | Stripe Checkout | keine Grundgebühr, nur eine Gebühr pro Verkauf |

Kostenschutz im Code:
- `FREE_PER_DAY` (Standard 3): Gratisbilder pro Nutzer und Tag. Als Schlüssel dient ein gesalzener Hash der IP-Adresse, nicht die IP selbst.
- `DAILY_IMAGE_CAP` (Standard 120): globales Tageslimit, bewusst unter dem Neuron-Freikontingent.
  Grobe Rechnung nach Herstellerangabe, nicht nachgemessen: 4,8 Neurons pro 512²-Kachel plus 9,6 pro Schritt.
  Bei 1024² und 4 Schritten sind das etwa 58 Neurons pro Bild, also rund 170 Bilder pro Tag.
- **Den Cloudflare-Account nicht auf „Workers Paid“ umstellen.** Sonst wird Mehrverbrauch abgerechnet, statt blockiert zu werden.

## Ablauf

1. `POST /api/generate`: Limits prüfen, Prompt bauen, Bild erzeugen, Original 48 h in KV ablegen,
   Vorschau zurückgeben (max. 1080 px, gekacheltes Wasserzeichen).
2. `POST /api/checkout`: Stripe-Checkout-Session mit der Bild-ID in den Metadaten anlegen.
3. `GET /api/full?session_id=…`: Zahlung bei Stripe prüfen und das Bild in Geräteauflösung ohne Wasserzeichen ausliefern.

Das saubere Original verlässt den Server nur nach bestätigter Zahlung.

## Einrichtung

```bash
npm install
npm run assets                              # watermark.png + Icons neu erzeugen (Python + Pillow)
npx wrangler login
npx wrangler kv namespace create KV         # ID in wrangler.jsonc eintragen
npx wrangler secret put IP_SALT             # beliebiger zufälliger String
npx wrangler secret put STRIPE_SECRET_KEY   # sk_test_… zum Testen
npm run deploy
```

Im Cloudflare-Dashboard muss **Images** aktiviert sein. Ohne Images-Binding liefert `/api/generate`
absichtlich einen Fehler, damit nie ein Bild ohne Wasserzeichen herausgeht.

Claude später aktivieren: `wrangler secret put ANTHROPIC_API_KEY` ausführen und `PROMPT_ENGINE` auf `"claude"` setzen.
Bei einem Fehler oder einer Ablehnung durch Claude fällt die App automatisch auf die Vorlage zurück.

## Tests

```bash
npm test
```

Geprüft werden Prompt-Bau, Gerätegrößen, Limits und der komplette API-Ablauf, mit Test-Doubles für
AI, Images, KV und Stripe. **Gegen das echte Cloudflare und Stripe ist der Code noch nicht getestet.**

## Offene Punkte vor dem Livegang

- Original-Prompts in `src/prompts.js` eintragen.
- Impressum und Datenschutzerklärung ausfüllen (`public/impressum.html`, `public/datenschutz.html`).
- Gewerbe und Steuern klären (z. B. Kleinunternehmerregelung). Bei digitalen Inhalten im Checkout die Zustimmung zum Erlöschen des Widerrufsrechts einholen.
- Einen Stripe-Webhook statt der reinen Session-Abfrage einbauen, falls Käufe protokolliert werden sollen.
- Bot-Schutz ergänzen (z. B. Cloudflare Turnstile, ebenfalls gratis), da sich IP-Limits per VPN umgehen lassen.
