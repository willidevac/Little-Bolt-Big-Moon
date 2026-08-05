# Projektstruktur

```text
Spiel/
├── index.html                 Hauptseite
├── style.css                  zentraler CSS-Einstieg
├── script.js                  zentraler JavaScript-Einstieg
├── package.json               reproduzierbare Entwicklungsbefehle
├── tools/                     kleiner lokaler Entwicklungsserver
├── html/
│   ├── fragments/             kleine, statische Bereiche der Hauptseite
│   └── pages/                 eigenständige Zusatzseiten
├── classes/                   alle objektorientierten Klassen
│   ├── base/                  DrawableObject, MovableObject
│   ├── core/                  Game, GameLoop, World, SceneBuilder, Registry, Camera
│   ├── entities/              Charakter, Gegner, Waffen, Items
│   ├── environment/           Plattformen und Hintergründe
│   ├── systems/               Figurensteuerung, Kampf, Laufablauf, Routen, Score
│   ├── input/                 Tastatur und Touch
│   └── ui/                    Bildschirme, Dialoge, HUD-Status und Rückmeldungen
├── js/
│   ├── config/                feste Werte und Assetpfade
│   ├── app/                   Composition Root und Game-Fabrik
│   ├── factories/             übersichtliche Verdrahtung von Spielsystemen
│   ├── levels/                Levelaufbau
│   ├── ui/                    DOM-Bildschirme und Dialoge
│   └── utils/                 kleine Hilfsfunktionen
├── data/                      JSON-Level, Upgrades und Assetnachweise
├── img/
│   ├── sprites/               Figuren, Gegner, Waffen, Items, Effekte, Props
│   ├── environment/           Wände, Plattformen und Bossarena
│   ├── backgrounds/           15 tatsächlich verwendete Landschaftsbilder
│   ├── ui/                    Buttons, Karten und Anzeigen
│   └── fonts/                 lokal eingebundene Schriftarten
├── styles/                    aufgeteilte CSS-Dateien
├── templates/                 durch die Kurs-Checkliste verlangter Vorlagenordner
├── audio/                     lokal eingebundene Musik und Effekte
└── docs/                      Planung und Projektnachweise
```

## Regeln

- Eine Klasse pro `.class.js`-Datei.
- Keine Gameplaylogik in `script.js`.
- Keine Klassen unter `js/`.
- Keine statischen HTML-Bereiche unnötig mit JavaScript generieren.
- `index.html` bleibt der kurze Einstieg; Markupbereiche liegen unter `html/`.
- Funktionen bleiben klein und erfüllen jeweils eine Aufgabe.
- Keine JavaScript-Datei überschreitet 400 Zeilen.
- Namen bleiben englisch und verwenden konsistentes `camelCase`.

## Abhängigkeitsrichtung

```text
script.js
  → js/app
    → factories und level
      → classes/core und classes/systems
        → entities, environment und gemeinsame config
```

`classes/core/` importiert keine Module aus `js/app/`, `js/factories/`,
`js/levels/` oder `js/ui/`. `qa-architecture-boundaries.mjs` sichert diese
Grenze sowie das Verbot versteckter UI-Singletons automatisch ab.

Die Struktur folgt KISS: Eine neue Schicht entsteht nur, wenn sie eine
konkrete Abhängigkeit oder einen Lebenszyklus sichtbar macht. Kleine reine
Hilfsfunktionen bleiben Funktionen; Klassen werden nur für Objekte mit eigenem
Zustand und Verhalten verwendet.
