# P0-Produktionskatalog

Dieser Katalog ist die verbindliche menschlich lesbare Grundlage für alle
Grafikarbeiten an **Little Bolt, Big Moon**. Die maschinenlesbare Einzelquelle
für Dateipfade, Raster, Zustände, Framezahlen und Lizenz-IDs ist
[`data/asset-manifest.json`](../data/asset-manifest.json).

## 1. Produktionsregeln

- Sprites und Tiles werden als PNG mit transparentem Hintergrund exportiert.
- Byte wird im Clean-HD-Raster nativ gezeichnet. Die übrigen bisherigen
  Figuren und Tiles werden im Spiel ganzzahlig auf das Zweifache skaliert.
- Neue Clean-HD-Hintergründe entstehen als `1024 × 1536 px` große
  Panoramen. Transparente Mittel- und Nahschichten liegen getrennt vor.
- `imageSmoothingEnabled` bleibt für Pixel-Art deaktiviert.
- Sprites erhalten rundherum zwei transparente Pixel Reserve.
- Der sichtbare Körper darf den Framerand in keinem Animationszustand
  berühren.
- Blickrichtung rechts ist die Masterrichtung. Links wird im Spiel gespiegelt.
- Alle Animationsframes liegen in Leserichtung von links nach rechts und danach
  von oben nach unten.
- Exportnamen verwenden ausschließlich Kleinbuchstaben und Bindestriche.
- Die Palette aus [`asset-guide.md`](asset-guide.md) ist verbindlich.

## 2. Figuren und Gegner

| Asset | Datei | Frame | Frames | Pflichtzustände |
| --- | --- | ---: | ---: | --- |
| Byte | `img/sprites/characters/byte-clean-hd.png` | 64 × 64 | 33 | idle 4, run 6, jump 1, fall 1, land 2, melee 4, shoot 3, hurt 2, sleep 4, dead 6 |
| Luma | `img/sprites/characters/luma.png` | 32 × 32 | 10 | poweredOff 1, idle 4, revive 5 |
| Schrottkrabbler | `img/sprites/enemies/scrap-crawler-clean-hd.png` | 96 × 64 | 13 | walk 4, attack 3, hurt 2, dead 4 |
| Drohnenwächter | `img/sprites/enemies/drone-guard.png` | 48 × 32 | 20 | idle 4, move 4, telegraph 3, attack 3, hurt 2, dead 4 |
| Mondwächter | `img/sprites/enemies/moon-warden.png` | 96 × 96 | 26 | idle 4, move 4, meleeAttack 5, rangedAttack 5, hurt 2, dead 6 |

Byte muss in jedem Zustand an Antenne, cyanfarbenem Gesicht und
halbiertem Mondabzeichen erkennbar bleiben. Luma nutzt dieselben
Grundproportionen, aber Creme, Mondblau und eine gerade Antenne. Gegner
verwenden rote Angriffssignale und deutlich andere Silhouetten.

## 3. Waffen, Items und Effekte

| Asset | Datei | Frame | Frames | Inhalt |
| --- | --- | ---: | ---: | --- |
| Spielerwaffen | `img/sprites/weapons/player-weapons.png` | 32 × 32 | 2 | Reparaturschlüssel, Bolzenwerfer |
| Bolzen | `img/sprites/weapons/bolt-projectile.png` | 16 × 8 | 2 | Flug |
| Drohnenschuss | `img/sprites/weapons/drone-projectile.png` | 16 × 16 | 4 | Flug |
| Bossprojektile | `img/sprites/weapons/boss-projectiles.png` | 32 × 16 | 8 | Schockwelle 4, Mondbolzen 4 |
| Collectibles | `img/sprites/items/collectables.png` | 32 × 32 | 15 | Zahnrad 4, Energie 4, Munition 1, Waffenpickup 4, Abzeichenhälften 2 |
| Upgrade-Icons | `img/sprites/items/upgrade-icons.png` | 32 × 32 | 5 | Energie, Schaden, Munition, Rückstoßschutz, Sprungkontrolle |
| Spieleffekte | `img/sprites/effects/gameplay-effects.png` | 32 × 32 | 23 | Sprungstaub 4, Treffer 4, Mündungslicht 3, Pickup 6, Explosion 6 |

Effekte dürfen nie die Trefferbox verdecken. Projektile benötigen eine klare
Flugrichtung und unterscheiden Spieler-Cyan von Gegner-Rot.

## 4. Tilesets und Landschaftszonen

Jede Zone erhält ein `256 × 128 px` großes Tileset aus `32 × 32 px` großen
Tiles. Damit stehen pro Zone 32 Slots für Kanten, Ecken, Mittelstücke,
Einzelplattformen und Dekoration bereit.

| Zone | Höhenbereich | Tileset | Hintergrundebenen |
| --- | ---: | --- | --- |
| Schrottplatz | 120.000–150.000 | `img/tilesets/scrapyard-tiles-clean-hd.png` | `scrapyard-far-clean-hd.png`, `scrapyard-mid-clean-hd.png`, `scrapyard-near-clean-hd.png` |
| Fabrik | 90.000–120.000 | `img/tilesets/factory-tiles.png` | `factory-far-clean-hd.png`, `factory-mid-clean-hd.png`, `factory-near-clean-hd.png` |
| Startturm/Wolken | 60.000–90.000 | `img/tilesets/launch-tower-tiles.png` | `launch-tower-far-clean-hd.png`, `launch-tower-mid-clean-hd.png`, `launch-tower-near-clean-hd.png` |
| Raumstation | 30.000–60.000 | `img/tilesets/space-station-tiles.png` | `space-station-far-clean-hd.png`, `space-station-mid-clean-hd.png`, `space-station-near-clean-hd.png` |
| Mond | 0–30.000 | `img/tilesets/moon-tiles.png` | `moon-far-clean-hd.png`, `moon-mid-clean-hd.png`, `moon-near-clean-hd.png` |

Alle Hintergrunddateien liegen unter `img/backgrounds/`. Das
Alle fünf Biomsets werden jeweils einmal über ihren zusammenhängenden
30.000-Pixel-Bereich geführt. Drei Scrollraten erzeugen
Tiefe ohne wiederholte Raumbilder. An der nächsten Zone werden vier
Weltpixel überlappt, damit auch bei
Rundungsfehlern keine Lücke sichtbar wird.

Das zusätzliche `img/tilesets/scrapyard-hazards-clean-hd.png` enthält
16 Clean-HD-Frames für Stacheln, Elektrizität, Warnleuchten und Arenatore.

## 5. Wortlose Story-Requisiten

| Moment | Datei | Frame | Frames |
| --- | --- | ---: | ---: |
| Leere Luma-Halterung am Start | `img/sprites/props/empty-luma-cradle.png` | 96 × 64 | 1 |
| Produktionsbild von Byte und Luma | `img/sprites/props/factory-duo-poster.png` | 64 × 96 | 1 |
| Transportkiste mit Luma-Zeichen | `img/sprites/props/luma-cargo-crate.png` | 64 × 64 | 1 |
| Blaues Signal Richtung Mond | `img/sprites/props/blue-signal-beacon.png` | 64 × 96 | 4 |
| Energiesockel im Finale | `img/sprites/props/moon-revive-socket.png` | 64 × 64 | 4 |

Diese Objekte erzählen die Geschichte ohne Dialog. Sie müssen auffallen,
dürfen aber nicht wie einsammelbare Gameplayobjekte blinken.

## 6. UI und lokale Schrift

| Asset | Datei | Raster/Größe | Frames |
| --- | --- | ---: | ---: |
| HUD-Symbole | `img/ui/hud-icons-clean-hd.png` | 48 × 48 | 8 |
| Neun-Segment-Panel | `img/ui/panel-tiles.png` | 16 × 16 | 9 |
| Touchsteuerung | `img/ui/touch-controls.png` | 48 × 48 | 12 |
| Menü-Symbole | `img/ui/menu-icons.png` | 24 × 24 | 6 |
| Bossleiste | `img/ui/boss-health-frame.png` | 320 × 32 | 1 |
| Normale UI-Schrift | `img/fonts/silkscreen-regular.ttf` | 16/24/32 px | 1 Datei |
| Fette UI-Schrift | `img/fonts/silkscreen-bold.ttf` | 18/24/32/48 px | 1 Datei |
| Gamecover | `img/cover/little-bolt-big-moon-cover-v1.png` | 1672 × 941 | 1 |

Die Touchsymbole besitzen pro Aktion einen normalen und einen gedrückten
Frame. Schriftdateien und `OFL.txt` werden erst beim Font-Integrationstask
aus der freigegebenen Originalquelle lokal übernommen.

## 7. Lizenzmatrix

| Lizenz-ID | Gilt für | Nachweis |
| --- | --- | --- |
| `openai-generated-output` | vorhandenes Konzept und Cover | `data/asset-credits.json`, OpenAI EU Terms |
| `openai-assisted-project-art` | alle geplanten Produktionssprites, Tiles, Hintergründe und UI-Grafiken | `data/asset-credits.json`, manuelle Überarbeitung pro Datei verpflichtend |
| `silkscreen-ofl-1.1` | Silkscreen Regular und Bold | offizielles Google-Fonts-Verzeichnis und dortige `OFL.txt` |

Ein Produktionsasset gilt erst als integriert, wenn sein tatsächlicher
Dateieintrag in `data/asset-credits.json` ergänzt wurde. Der Manifest-Eintrag
allein dokumentiert nur die freigegebene Produktionsquelle.

## 8. Produktionsreihenfolge

1. Byte-Masterframe und Größenvergleich mit einem 32-Pixel-Tile.
2. Byte-Zustände `idle`, `run`, `jump`, `fall`.
3. Schrottplatz-Tiles und erster lückenloser Hintergrund.
4. Restliche Byte-, Gegner- und Kampfanimationen.
5. Weitere vier Zonen mit Story-Requisiten.
6. HUD, Touchsteuerung und Upgrade-Icons.
7. Mondwächter, Luma und Finale.

So entsteht zuerst ein spielbarer visueller Abschnitt. Nicht benötigte
P1-Varianten werden erst begonnen, wenn alle hier aufgeführten P0-Dateien
vorhanden und getestet sind.
