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
| Byte und Luma | 32 × 32 px | 64 × 64 px |
| Schrottkrabbler/Drohne | 48 × 32 px | 96 × 64 px |
| Endboss | 96 × 96 px | 192 × 192 px |
| Plattform-Tiles | 32 × 32 px | 64 × 64 px |
| Waffen und Items | 16–32 px | ganzzahlig × 2 |
| UI-Symbole | 24 × 24 px | 24 oder 48 px |
| Hintergrundsegment | 320 × 360 px | 1280 × 1440 px |

Die vollständigen Dateinamen, Sheetmaße und Framezahlen stehen im
[`P0-Produktionskatalog`](asset-production-catalog.md) und maschinenlesbar in
[`data/asset-manifest.json`](../data/asset-manifest.json).

## Produktionsablauf

1. Konzeptbild nur als visuelle Referenz verwenden.
2. Eine verbindliche Masteransicht von Byte pixelgenau zeichnen.
3. Proportionen, Palette und Konturen sperren.
4. Erst danach Animationsframes erstellen.
5. Jedes Spritesheet bei nativer Größe und vierfacher Vergrößerung prüfen.
6. Assets mit beschreibenden englischen Dateinamen exportieren.
7. Tatsächliche Datei und Herkunft vor Integration in
   `data/asset-credits.json` ergänzen.

Sound gehört nicht zur aktuellen Assetphase.
