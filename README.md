# Little Bolt, Big Moon

![Little Bolt, Big Moon – Game Cover](img/cover/little-bolt-big-moon-cover-v1.png)

> Ein kleiner aussortierter Roboter. Ein riesiger Turm. Ein Freund, der auf
> dem Mond wartet.

## Schnellstart

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Danach läuft das Spiel unter `http://127.0.0.1:4173`. Ein lokaler Server ist
nötig, weil die Oberfläche HTML-Fragmente und native ES-Module lädt.

Die vollständige technische Abnahme startet mit:

```bash
npm run check
```

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | kleiner lokaler Node-Server ohne Framework |
| `npm test` | vollständiges, automatisch entdecktes Release-Gate |
| `npm run lint` | ESLint für Produktions- und Testcode |
| `npm run typecheck` | strikte Typprüfung der deterministischen Kernmodule |
| `npm run test:architecture` | Import- und Architekturgrenzen |
| `npm run test:release` | zentrale Spieler- und UI-Wege |

**Little Bolt, Big Moon** ist ein schwieriges vertikales
2D-Präzisionsspiel für HTML5 Canvas. Byte klettert vom Schrottplatz durch
eine verlassene Fabrik, über den Wolken und durch eine alte Raumstation bis
zum Mond. Ein falscher Sprung oder ein gegnerischer Treffer kann ihn mehrere
Bildschirmhöhen zurückwerfen.

## Spielidee

Der Spieler bewegt Byte innerhalb einer hohen, zusammenhängenden Welt nach
oben. Statt klassisch nach rechts zu laufen, stehen präzise Sprünge, der
Umgang mit großer Fallhöhe und offene Gegnerphasen im Mittelpunkt.

Der Spielablauf:

1. Plattformen erklimmen und riskante Sprünge meistern
2. Zahnräder, Energiezellen und neue Waffen finden
3. Gegnerphasen überstehen, ohne heruntergestoßen zu werden
4. eines von drei Upgrades auswählen
5. nach einem Sturz verlorene Höhe erneut erklimmen
6. den Mond erreichen und den Endboss besiegen

## Wortlose Geschichte

Byte und Luma wurden gemeinsam als Reparaturroboter für eine Mondmission
gebaut. Wegen seiner schiefen Antenne wurde Byte jedoch aussortiert und auf
dem Schrottplatz zurückgelassen, während Luma allein zum Mond geschickt
wurde.

Die Geschichte wird nicht durch Dialoge erklärt. Transportkisten, alte
Produktionsanlagen, das geteilte Mondabzeichen und Lumas blaues Signal
erzählen während des Aufstiegs, was zwischen den beiden Robotern passiert
ist.

## Features

- zusammenhängende vertikale Welt mit 150.000 Pixeln Höhe
- fünf Biome mit insgesamt 15 unterschiedlich gebauten Abschnitten
- Kamera, die Byte beim Aufstieg und Fallen begleitet
- aufladbarer Präzisionssprung ohne nachträgliche Luftsteuerung
- statische, fallende, federnde und als Falle markierte Plattformen
- zwei normale Gegnertypen, Zwischenbosse und ein Endboss
- Rückstoß durch Gegner und Projektile
- Schraubenschlüssel und auffindbarer Bolzenwerfer
- wählbare Verbesserungen nach bestandenen Gegnerphasen
- lokale Highscore- und Höhenauswertung
- Desktop- und Touchsteuerung im Querformat
- gespeicherte Deutsch-/Englisch-Umschaltung in den Einstellungen
- Start-, Gewinn- und Game-over-Bildschirm
- wortlose Anfangs- und Endsequenz

## Landschaft

Die Umgebung erzählt gleichzeitig den Fortschritt:

```text
Mond und Endboss
        ↑
Raumstation und Sterne
        ↑
Wolken und Startturm
        ↑
Fabrik
        ↑
Schrottplatz
```

Warme Rost- und Industrietöne verändern sich während des Aufstiegs zu
Violett, Mondblau und Cyan. Der Mond wird im Hintergrund immer größer.

## Technik

- HTML5 Canvas
- objektorientiertes JavaScript
- JSON für Level-, Upgrade- und Assetdaten
- HTML und CSS für Menüs und responsive Oberfläche
- `localStorage` für Einstellungen und lokale Rekorde

Das Projekt folgt bewusst dem KISS-Prinzip: kein Framework, kein Bundler und
keine unnötige Runtime-Abhängigkeit. `script.js` delegiert an eine zentrale
Composition Root. Gameplayklassen kennen weder DOM-Bootstrap noch konkrete
UI-Initialisierung. Levelinhalt und Balancingpläne liegen getrennt von den
Builder-Algorithmen in Konfigurationsmodulen.

Die Typprüfung wird schrittweise eingesetzt. Aktuell werden die besonders
deterministischen und wiederverwendbaren Kernmodule strikt geprüft; eine
Komplettmigration zu TypeScript wäre für dieses native Canvas-Projekt derzeit
mehr Komplexität als Nutzen.

Alle Klassen werden nach Verantwortung gegliedert. `script.js` bleibt ein
kleiner Einstiegspunkt und enthält keine Gameplaylogik.

## Projektstatus

Das Spiel ist vom Startbildschirm bis zum Ende spielbar. Der aktuelle Stand
ist ein Release-Kandidat: Gameplay, Gegner, Upgrades, Audio, responsive
Steuerung und Abschlusssequenz sind umgesetzt. Die nachvollziehbaren Befehle
oben prüfen die automatisierten Qualitäts-, Architektur- und Release-Verträge.

## Extras über die Pflichtanforderungen

- 150.000 Pixel hohe Präzisionswelt statt eines kurzen Einzellevels
- 15 Abschnitte mit eigenen Sprungmustern und biomeabhängiger Schwierigkeit
- Zwischenboss-Sperren mit Statusanzeige zwischen den großen Gebieten
- auffindbare Waffe, Waffenwechsel und dauerhafte Verbesserungen im Lauf
- wortlose Umweltgeschichte vom Schrottplatz bis zum Mond
- lokal gespeicherte Rekorde sowie getrennte Musik- und Effektlautstärke

## Dokumentation

- [`docs/game-design.md`](docs/game-design.md) – Story und Spielkern
- [`docs/asset-guide.md`](docs/asset-guide.md) – visueller Stil und Assetgrößen
- [`docs/asset-licensing.md`](docs/asset-licensing.md) – Herkunft und Nutzung
- [`docs/project-structure.md`](docs/project-structure.md) – Ordner und Zuständigkeiten
- [`docs/quality-audit.md`](docs/quality-audit.md) – sichtbare und technische Abnahme
- [`tests/README.md`](tests/README.md) – Testebenen und Release-Gates
- [`data/asset-credits.json`](data/asset-credits.json) – Assetnachweise

## Asset-Hinweis

Das visuelle Konzept, das Gamecover und die Produktionsgrafiken wurden mit
OpenAI-Bildgenerierung erstellt, für das Spiel aufbereitet und im Projekt
dokumentiert. Herkunft und Nutzung aller eingebundenen Assets stehen in der
Lizenzdokumentation und in den Assetnachweisen.
