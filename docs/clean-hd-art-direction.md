# Clean-HD-Pixel-Art-Direction

Status: Stilrichtung freigegeben, Byte-Runtime integriert und in Prüfung

## Ziel

Little Bolt, Big Moon bleibt ein Pixel-Art-Spiel. Die Grafiken erhalten jedoch
mehr nutzbare Bildpunkte, ruhigere Flächen und eine klarere Trennung zwischen
Spielfeld und Landschaft.

Die Probe kann über `art-preview.html` auf dem lokalen Live Server betrachtet
werden.

## Verbindliche Gestaltungsregeln

1. Große Farbflächen ersetzen zufällige Kratzer, Flecken und Mikropaneele.
2. Sichere Plattformen besitzen eine helle, durchgehende Oberkante.
3. Figuren, Gegner und Gefahren haben den höchsten Kontrast.
4. Der Hintergrund verliert mit zunehmender Entfernung Kontrast und Sättigung.
5. Die Beleuchtung kommt für alle Objekte von links oben.
6. Cyan markiert Byte, Energie und hilfreiche Technik.
7. Rot markiert Gegnerkerne, Warnungen und unmittelbare Gefahren.
8. Orange und Kupfer verbinden Byte mit dem Schrottplatz.

## Technische Richtung

- Runtime-Sprites werden in doppelter Quellauflösung neu aufgebaut.
- Ihre sichtbare Größe und ihre Kollisionsboxen bleiben unverändert.
- Canvas zeichnet Pixelgrafiken weiterhin ohne Bildglättung.
- Figurenanimationen behalten ihre vorhandenen Zustände und Frame-Reihenfolgen.
- Hintergründe enthalten keine eingebauten Plattformen, Gegner oder HUD-Teile.
- Jede Runtime-Datei wird erst nach einer visuellen Freigabe ersetzt.

## Enthaltene Stilproben

- `clean-hd-gameplay-v1.png`: gemeinsame Zielwirkung im Spiel
- `clean-hd-scrapyard-background-v1.png`: Hintergrund ohne Spielflächen
- `byte-core-poses-v1.png`: vier transparente Byte-Kernposen
- `scrapyard-gameplay-kit-v1.png`: Gegner und zwei Plattformzustände

Die transparenten Bögen sind Design- und Größenproben. Für die Runtime werden
die vollständigen Animationen anschließend einzeln ausgerichtet und in feste
Zellen gepackt.

## Erste Runtime-Umsetzung

- `img/concepts/approvals/byte-clean-hd-production-layout-v1.png` enthält das
  vollständige Produktionsmuster mit allen 33 Byte-Posen.
- `img/sprites/characters/byte-clean-hd.png` enthält das transparente
  Laufzeitblatt aus 8 × 5 Zellen mit jeweils 64 × 64 Pixeln.
- Byte bleibt im Canvas 64 × 64 Pixel groß. Kollisionsflächen, Zustände und
  Frame-Reihenfolge wurden nicht verändert.
- `img/tilesets/scrapyard-tiles-clean-hd.png` enthält 32 lückenlos
  ausgerichtete Plattform-, Wand-, Bewegungs- und Zerfallstiles.
- `img/tilesets/scrapyard-hazards-clean-hd.png` enthält jeweils vier
  Animationsstufen für Stacheln, Strom, Warnleuchten und Arenatore.
- Beide Tileblätter verwenden native 64-Pixel-Zellen. Plattformgröße,
  Oberflächenversatz und Gefahren-Hitbox bleiben unverändert.
- `img/sprites/enemies/scrap-crawler-clean-hd.png` enthält alle 13 Lauf-,
  Angriffs-, Treffer- und Ausschaltframes in nativen 96 × 64 Pixeln.
- Der Crawler bleibt im Canvas 96 × 64 Pixel groß. Hitbox,
  Animationsreihenfolge und Gegnerverhalten wurden nicht verändert.
- `img/ui/hud-icons-clean-hd.png` enthält acht native 48-Pixel-Symbole für
  die tatsächlich sichtbaren HUD-Werte und die Pause.
- HUD-Rahmen bleiben responsive CSS-Flächen mit ruhiger Oberkante,
  klarer Creme-Kontur und dunklem, kontrastreichem Innenraum.

## Reihenfolge nach der Freigabe

1. Byte mit allen 33 Frames
2. Schrottplatz-Plattformen und Gefahren
3. Scrap Crawler
4. HUD-Symbole und Rahmen
5. Schrottplatz-Hintergründe
6. Übertragung der Regeln auf die weiteren Biome
