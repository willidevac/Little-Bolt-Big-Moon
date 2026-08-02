# Projektstruktur

```text
Spiel/
├── index.html                 Hauptseite
├── style.css                  zentraler CSS-Einstieg
├── script.js                  zentraler JavaScript-Einstieg
├── html/
│   ├── fragments/             kleine, statische Bereiche der Hauptseite
│   └── pages/                 eigenständige Zusatzseiten
├── classes/                   alle objektorientierten Klassen
│   ├── base/                  DrawableObject, MovableObject
│   ├── core/                  Game, GameLoop, World, EntityRegistry, Camera
│   ├── entities/              Charakter, Gegner, Waffen, Items
│   ├── environment/           Plattformen und Hintergründe
│   ├── systems/               Kampfzustände, Bossangriffe, Laufvorräte, Routen, Score
│   ├── input/                 Tastatur und Touch
│   └── ui/                    Canvas-Statusanzeigen
├── js/
│   ├── config/                feste Werte und Assetpfade
│   ├── levels/                Levelaufbau
│   ├── ui/                    DOM-Bildschirme und Dialoge
│   └── utils/                 kleine Hilfsfunktionen
├── data/                      JSON-Level, Upgrades und Assetnachweise
├── img/
│   ├── concepts/              nicht direkt verwendete Designreferenzen
│   ├── sprites/               Figuren, Gegner, Waffen, Items, Effekte, Props
│   ├── tilesets/              Plattform- und Umgebungskacheln
│   ├── backgrounds/           Landschaft und Parallax-Ebenen
│   ├── ui/                    Buttons, Karten und Anzeigen
│   └── fonts/                 lokal eingebundene Schriftarten
├── styles/                    aufgeteilte CSS-Dateien
├── templates/                 optionale wiederverwendbare Markupteile
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
