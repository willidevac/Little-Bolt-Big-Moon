# Asset Guide

## Stil

Niedliche, gut lesbare Pixel-Art mit klaren Silhouetten. Die Farbwelt
entwickelt sich von warmem Rost zu kühlem Mondlicht.

## Verbindliche Palette

| Verwendung | Farbe |
|---|---|
| Konturen | `#242733` |
| Rostorange | `#C76636` |
| Warmes Creme | `#F1D6A4` |
| Freundliches Cyan | `#63D6D2` |
| Mondblau | `#7EA5D8` |
| Weltraumviolett | `#67548E` |
| Kontrollsignal | `#D94A4A` |

## Zielgrößen

| Asset | Raster | Darstellung im Spiel |
|---|---:|---:|
| Byte | 64 × 64 px | 64 × 64 px |
| Luma | 32 × 32 px | 64 × 64 px |
| Schrottkrabbler/Drohne | 96 × 64 px | 96 × 64 px |
| Endboss | 192 × 192 px | 192 × 192 px |
| Waffen und Items | 16–96 px | native Clean-HD-Größe |
| UI-Symbole | 48 × 48 px | 24 oder 48 px |
| Hintergrundabschnitt | 1024 × 1536 px | bildschirmfüllender Ausschnitt |

Die vollständigen Dateinamen, Sheetmaße und Framezahlen stehen im
[`P0-Produktionskatalog`](asset-production-catalog.md) und maschinenlesbar in
[`data/asset-manifest.json`](../data/asset-manifest.json).

## Produktionsablauf

1. Proportionen, Palette und Konturen vor der Animation sperren.
2. Jedes Spritesheet bei nativer Größe und vierfacher Vergrößerung prüfen.
3. Assets mit beschreibenden englischen Dateinamen exportieren.
4. Nur die tatsächlich verwendete Laufzeitdatei einchecken.
5. Tatsächliche Datei und Herkunft vor Integration in
   `data/asset-credits.json` ergänzen.
