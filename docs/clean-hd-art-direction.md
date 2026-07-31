# Clean-HD-Pixel-Art-Direction

Status: Stilrichtung freigegeben, Schrottplatz-Hintergrund in Prüfung

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
- `img/sprites/enemies/drone-guard-clean-hd.png` enthält alle 20 Schwebe-,
  Flug-, Warn-, Angriffs-, Treffer- und Ausschaltframes in 96 × 64 Pixeln.
- Die Drohne bleibt im Canvas 96 × 64 Pixel groß. Hitbox, Flugbewegung,
  Schussverhalten, Zustände und Frame-Reihenfolge bleiben unverändert.
- `img/sprites/enemies/moon-warden-clean-hd.png` enthält 26 Bossframes und
  zwei transparente Reservefelder in nativen 192 × 192 Pixeln.
- Der Wächter bleibt im Canvas 192 × 192 Pixel groß. Hitbox, drei Kampfphasen,
  Nah- und Fernangriff, Kampfwerte und Frame-Reihenfolge bleiben unverändert.
- Waffen und Projektile verwenden native Clean-HD-Zellen: Spielerwaffen
  64 × 64, Bolzen 32 × 16, Drohnenschüsse 32 × 32, Bossgeschosse 64 × 32,
  Lichtbogenkanone 96 × 64 und Lichtbogenimpulse 64 × 64 Pixel.
- Die sichtbaren Projektilgrößen, Trefferflächen, Flugbahnen, Schäden,
  Munitionswerte und Animationsreihenfolgen bleiben unverändert.
- Collectibles, Upgrade-Symbole und Gameplay-Effekte verwenden native
  64 × 64 Pixel; die Lichtbogenladung verwendet native 48 × 72 Pixel.
- Sichtbare Größen, Sammelwerte, Upgrade-Wirkungen, Trefferlogik und
  Animationsreihenfolgen bleiben unverändert.
- `img/ui/hud-icons-clean-hd.png` enthält acht native 48-Pixel-Symbole für
  die tatsächlich sichtbaren HUD-Werte und die Pause.
- HUD-Rahmen bleiben responsive CSS-Flächen mit ruhiger Oberkante,
  klarer Creme-Kontur und dunklem, kontrastreichem Innenraum.
- Der gesamte 30.000-Pixel-Schrottplatz verwendet genau ein gemeinsames
  Clean-HD-Set aus Fern-, Mittel- und Nahpanorama.
- Die drei Ebenen bewegen sich mit getrennten Scrollraten. Sie wiederholen
  sich innerhalb des Bioms nicht und enthalten keine Spielflächen.
- Die Fabrik verwendet dieselbe Drei-Ebenen-Technik von Höhe 120.000 bis
  90.000. Warmes Ofenlicht entwickelt sich dabei zu kühlem Mondblau.
- Seitlich montierte Produktionsarme und leere orange sowie cremefarbene
  Halterungen erzählen die gemeinsame Herkunft, ohne Laufkanten vorzutäuschen.
- Der Startturm verwendet dieselbe Drei-Ebenen-Technik von Höhe 90.000 bis
  60.000. Fabrikblau entwickelt sich über große Wolken zu Sternenblau.
- Turmspitzen, Antennen und Randstreben bleiben vertikal. Story-Requisiten
  werden weiterhin erst in der abschließenden Storyphase ergänzt.
- Die Raumstation verwendet dieselbe Drei-Ebenen-Technik von Höhe 60.000 bis
  30.000. Die Erde bleibt unten zurück, während der Mond oben näher rückt.
- Stationsmodule und Hüllenrahmen bleiben an den Seiten. Der breite,
  sternenklare Spielkorridor enthält keine vorgetäuschten Plattformen.
- Der Mond verwendet dieselbe Drei-Ebenen-Technik von Höhe 30.000 bis null.
  Erde, Ruinen und Wächterfestung markieren Anfang, Mitte und Endziel.
- Senkrechte Ruinenfragmente und schmale Basaltrahmen halten den zentralen
  Sprungweg frei und sind nicht mit echten Plattformen zu verwechseln.

## Reihenfolge nach der Freigabe

1. Byte mit allen 33 Frames
2. Schrottplatz-Plattformen und Gefahren
3. Scrap Crawler
4. HUD-Symbole und Rahmen
5. Schrottplatz-Hintergründe
6. Übertragung der Regeln auf die weiteren Biome
