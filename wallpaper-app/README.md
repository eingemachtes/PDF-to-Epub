# Innenleben Wallpaper

PWA, die ein Wallpaper „Blick zum Innenleben“ passend zur Auflösung des eigenen Geräts erzeugt.
Gratis gibt es eine Vorschau mit fest eingebranntem Wasserzeichen. Gegen Bezahlung (Stripe) gibt es
die volle Geräteauflösung ohne Wasserzeichen.

**Prompts:** Die Original-Prompts aus der Wallpaper-Sitzung (Laptop 16:10, Smartphone hochkant) stehen
wörtlich in `prompts/originale.md`. In `src/prompts.js` sind sie in priorisierte Bausteine zerlegt. Mit
Standardeinstellungen ergibt das inhaltlich wieder das Original, nur ohne die Midjourney-Parameter.
Das Tablet-Motiv und die Farbwelten außer „Petrol & Kupfer“ sind daraus abgeleitet und noch **nicht erprobt**.

| Einstellung | Wirkung |
|---|---|
| Innenleben | Laptop / Smartphone / Tablet, standardmäßig passend zum Seitenverhältnis |
| Farbwelt | Platinen-, Modul- und Kabelfarben sowie die Mood-Zeile |
| Kontrast | Weich (Laptop-Original) oder Mittel (Handy-Original) |
| Einblicke | Aufgeschnitten (Kühlplatte, Abschirmung, Akkufolie) oder geschlossen |
| Ruhige Fläche | Platz für Uhr und Icons (Handy-Original: an, Laptop-Original: aus) |

Midjourney-Parameter werden umgesetzt: `--ar` über die echte Bildgröße, `--no` als kurzer positiver
Zusatz (die Gratis-Modelle kennen keine Negativ-Prompts). `--style raw` und `--s 50` haben keine Entsprechung.

## Architektur (ausgelegt auf 0 € Betriebskosten)

| Teil | Dienst | Kosten |
|---|---|---|
| Hosting PWA + API | Cloudflare Workers, Free-Plan | 0 € (100.000 Requests/Tag) |
| Bildgenerierung | Workers AI `flux-2-klein-4b` (Lizenz Apache-2.0, freie Bildgröße) | 0 € im Rahmen von 10.000 Neurons/Tag; auf dem **Free-Plan** schlagen weitere Aufrufe mit einem Fehler fehl, statt Kosten zu verursachen |
| Prompt-Erstellung | Vorlage in `src/prompts.js` | 0 € |
| Prompt-Erstellung (optional) | Claude (`PROMPT_ENGINE=claude`) | **kostenpflichtig**, standardmäßig aus |
| Zuschnitt + Wasserzeichen | Cloudflare Images-Binding | 0 € bis 5.000 Transformationen/Monat, darüber Fehler statt Kosten |
| Speicher (Zähler, Originale 48 h) | Workers KV, Free | 0 € (1.000 Schreibvorgänge/Tag) |
| Bezahlung | Stripe Checkout | keine Grundgebühr, nur eine Gebühr pro Verkauf |

Kostenschutz im Code:
- `FREE_PER_DAY` (Standard 3): Gratisbilder pro Nutzer und Tag. Als Schlüssel dient ein gesalzener Hash der IP-Adresse, nicht die IP selbst.
- `DAILY_NEURON_BUDGET` (Standard 9.000): globales Tagesbudget, bewusst unter den 10.000 Gratis-Neurons.
  Schätzung nach Cloudflare-Preisliste, nicht nachgemessen: 26,05 Neurons pro ausgegebener 512²-Kachel.
  Ein Bild mit 1536 px Kantenlänge hat 6 Kacheln, kostet also rund 156 Neurons. Das ergibt etwa **57 Bilder pro Tag**.
  Das Bild wird danach per Cloudflare Images auf die Geräteauflösung hochskaliert.
- Alternative `IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell`: rund 58 Neurons pro Bild, also etwa 150 Bilder pro Tag.
  Dieses Modell erzeugt aber nur quadratische Bilder ohne Größenangabe. Beim Zuschnitt aufs Handy-Hochformat
  gehen die Seiten verloren, das randlose Rahmen-Motiv funktioniert dann nicht. Außerdem liest es nur etwa
  256 Tokens, deshalb kürzt die App den Prompt dafür auf ~1.000 Zeichen.
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

- Echte Testbilder erzeugen und prüfen: Hält `flux-2-klein-4b` die langen Prompts (Token-Limit nicht dokumentiert)? Passt die Qualität nach dem Hochskalieren?
- Impressum und Datenschutzerklärung ausfüllen (`public/impressum.html`, `public/datenschutz.html`).
- Gewerbe und Steuern klären (z. B. Kleinunternehmerregelung). Bei digitalen Inhalten im Checkout die Zustimmung zum Erlöschen des Widerrufsrechts einholen.
- Einen Stripe-Webhook statt der reinen Session-Abfrage einbauen, falls Käufe protokolliert werden sollen.
- Bot-Schutz ergänzen (z. B. Cloudflare Turnstile, ebenfalls gratis), da sich IP-Limits per VPN umgehen lassen.
