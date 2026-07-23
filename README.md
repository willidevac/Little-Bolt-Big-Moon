# Little Bolt, Big Moon

![Little Bolt, Big Moon – Game Cover](img/cover/little-bolt-big-moon-cover-v1.png)

> Ein kleiner aussortierter Roboter. Ein riesiger Turm. Ein Freund, der auf
> dem Mond wartet.

**Little Bolt, Big Moon** wird ein schwieriges vertikales
2D-Präzisionsspiel für HTML5 Canvas. Byte klettert vom Schrottplatz durch
eine verlassene Fabrik, über den Wolken und durch eine alte Raumstation bis
zum Mond. Ein falscher Sprung oder ein gegnerischer Treffer kann ihn mehrere
Bildschirmhöhen zurückwerfen.

## Spielidee

Der Spieler bewegt Byte innerhalb einer hohen, zusammenhängenden Welt nach
oben. Statt klassisch nach rechts zu laufen, stehen präzise Sprünge, der
Umgang mit großer Fallhöhe und offene Gegnerphasen im Mittelpunkt.

Der geplante Spielablauf:

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

## Geplante Features

- vertikale Welt mit ungefähr 8.000 Pixeln Höhe
- Kamera, die Byte beim Aufstieg und Fallen begleitet
- präzise Sprungphysik mit Coyote Time und Jump Buffer
- statische, bewegliche und fallende Plattformen
- zwei normale Gegnertypen und ein Endboss
- Rückstoß durch Gegner und Projektile
- Nahkampfwaffe und zwei auffindbare Fernkampfwaffen
- zufällige Upgrade-Auswahl nach Gegnerphasen
- lokale Highscore- und Höhenauswertung
- Desktop- und Touchsteuerung im Querformat
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

Alle Klassen werden nach Verantwortung gegliedert. `script.js` bleibt ein
kleiner Einstiegspunkt und enthält keine Gameplaylogik.

## Projektstatus

Das Projekt befindet sich aktuell in der Design- und Assetphase. Das
visuelle Konzept, die Projektstruktur und das Gamecover stehen bereits.
Sound wird bewusst erst nach der visuellen Assetphase bearbeitet.

## Dokumentation

- [`docs/game-design.md`](docs/game-design.md) – Story und Spielkern
- [`docs/asset-guide.md`](docs/asset-guide.md) – visueller Stil und Assetgrößen
- [`docs/asset-licensing.md`](docs/asset-licensing.md) – Herkunft und Nutzung
- [`docs/project-structure.md`](docs/project-structure.md) – Ordner und Zuständigkeiten
- [`data/asset-credits.json`](data/asset-credits.json) – Assetnachweise

## Asset-Hinweis

Das visuelle Konzept und das Gamecover wurden mit OpenAI-Bildgenerierung
erstellt und für dieses Projekt dokumentiert. Die späteren Produktionssprites
werden anhand des Konzepts pixelgenau neu gestaltet und manuell animiert.
