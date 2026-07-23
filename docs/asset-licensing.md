# Asset-Herkunft und Lizenzierung

Das Konzeptbild wurde mit OpenAI-Bildgenerierung erstellt. Es dient als
Referenz und wird nicht unverändert als Spritesheet eingesetzt.

Die Produktionssprites werden anhand des Konzepts pixelgenau neu gestaltet,
vereinheitlicht und manuell animiert. Dadurch dokumentieren wir einen
wesentlichen eigenen Gestaltungsanteil.

## Dokumentationsregeln

- Jedes externe Asset erhält einen Eintrag in `data/asset-credits.json`.
- Jedes geplante P0-Asset referenziert in `data/asset-manifest.json` eine
  vorhandene Lizenz-ID aus `data/asset-credits.json`.
- Lizenzdateien heruntergeladener Pakete werden zusammen mit den Assets
  aufbewahrt.
- Bei Drittanbieter-Assets werden Autor, URL, Lizenz und Änderungen notiert.
- Assets ohne eindeutig dokumentierte Nutzungserlaubnis werden nicht genutzt.
- KI-unterstützte Grafiken werden nicht als vollständig menschengemacht
  ausgegeben.

Empfohlener Hinweis für Projektdokumentation oder Credits:

> Visual concept and selected assets created with OpenAI image generation
> and manually adapted for this project.

Die OpenAI-Bedingungen weisen den Output im Verhältnis zwischen Nutzer und
OpenAI grundsätzlich dem Nutzer zu, soweit das geltende Recht dies erlaubt.
Sie garantieren jedoch keine Exklusivität. Diese Dokumentation ist keine
Rechtsberatung.

## Freigegebene Produktionsquellen

| Lizenz-ID | Quelle | Verwendung |
| --- | --- | --- |
| `openai-generated-output` | OpenAI EU Terms | vorhandenes Konzept und Cover |
| `openai-assisted-project-art` | OpenAI EU Terms plus dokumentierte manuelle Pixel-Art-Überarbeitung | neue Sprites, Tiles, Hintergründe und UI-Grafiken |
| `silkscreen-ofl-1.1` | offizielles Google-Fonts-Verzeichnis mit `OFL.txt` | lokale UI-Schrift Silkscreen Regular/Bold |

Silkscreen wird ausschließlich aus
`https://github.com/google/fonts/tree/main/ofl/silkscreen` übernommen. Die
dortige `OFL.txt` muss gemeinsam mit den beiden Schriftdateien unter
`img/fonts/` gespeichert werden.
