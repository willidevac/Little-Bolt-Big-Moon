# Laufzeit-Assetkatalog

Dieser Katalog beschreibt ausschließlich Dateien, die das aktuelle Spiel lädt.
Die maschinenlesbare Quelle ist
[`data/asset-manifest.json`](../data/asset-manifest.json); Herkunft und Lizenz
stehen in [`data/asset-credits.json`](../data/asset-credits.json).

## Figuren und Gegner

| Asset | Datei | Frame | Frames |
| --- | --- | ---: | ---: |
| Byte | `img/sprites/characters/byte-clean-hd.png` | 64 × 64 | 33 |
| Luma | `img/sprites/characters/luma.png` | 32 × 32 | 10 |
| Schrottkrabbler | `img/sprites/enemies/scrap-crawler-clean-hd.png` | 96 × 64 | 13 |
| Wächterdrohne | `img/sprites/enemies/drone-guard-clean-hd.png` | 96 × 64 | 20 |
| Mondwächter | `img/sprites/enemies/moon-warden-clean-hd.png` | 192 × 192 | 26 |

## Waffen, Items und Effekte

| Asset | Datei | Frame/Größe | Frames |
| --- | --- | ---: | ---: |
| Spielerwaffen | `img/sprites/weapons/player-weapons-clean-hd.png` | 64 × 64 | 2 |
| Bolzen | `img/sprites/weapons/bolt-projectile-clean-hd.png` | 32 × 16 | 2 |
| Drohnenschuss | `img/sprites/weapons/drone-projectile-clean-hd.png` | 32 × 32 | 4 |
| Bossprojektile | `img/sprites/weapons/boss-projectiles-clean-hd.png` | 64 × 32 | 8 |
| Lichtbogenkanone | `img/sprites/weapons/arc-cannon-clean-hd.png` | 96 × 64 | 1 |
| Lichtbogenprojektil | `img/sprites/weapons/arc-projectile-clean-hd.png` | 64 × 64 | 4 |
| Sammelobjekte | `img/sprites/items/collectables-clean-hd.png` | 64 × 64 | 15 |
| Upgrade-Symbole | `img/sprites/items/upgrade-icons-clean-hd.png` | 64 × 64 | 5 |
| Spieleffekte | `img/sprites/effects/gameplay-effects-clean-hd.png` | 64 × 64 | 23 |
| Lichtbogenladung | `img/sprites/items/arc-charge-clean-hd.png` | 48 × 72 | 1 |

## Weltgrafiken

Jeder der 15 Abschnitte lädt genau ein ungestrecktes Hintergrundbild aus
`img/backgrounds/`. Die Dateinamen entsprechen der Abschnitts-ID aus
`data/levels/level-01.json` und enden auf `-background-v1.png`.

`img/environment/` enthält:

- fünf animierte Wandsets und fünf Wandplattform-Sets,
- fünf eigenständig gerenderte breite Kampfplattformen,
- fünf Schrottplatz-Plattformrollen und die durchgehende Startbodenplatte,
- Fabrikfalle, fallende Startturmplattform und Sprungfeder,
- Mondwächter-Arena und Eingangslift.

Es gibt keine Laufzeit-Tilesets, Parallax-Varianten oder Panorama-Duplikate.

## Story und Oberfläche

Die Anfangssequenz nutzt `empty-luma-cradle.png`, Byte, Luma und das aktuelle
Clean-HD-Sammelobjekt-Sheet. Sechs neue Storyobjekte unter
`img/sprites/props/story-*-clean-hd.png` erzählen den Weg bis zur Bossarena.

Die Oberfläche lädt ausschließlich `img/ui/hud-icons-clean-hd.png`, das Cover,
das Favicon sowie Silkscreen Regular und Bold. Touch-, Panel- und Menüsymbole
werden durch HTML/CSS gezeichnet und benötigen keine zusätzlichen Bilddateien.

## Integrationsregel

Eine Grafik darf nur eingecheckt bleiben, wenn sie durch Code, HTML, CSS oder
Leveldaten geladen wird, im Asset-Manifest steht und einen Herkunftseintrag
besitzt. `qa-runtime.mjs` vergleicht diese drei Mengen bei jeder Abnahme.
