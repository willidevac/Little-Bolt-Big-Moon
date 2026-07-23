# JavaScript außerhalb der Klassen

- `config/` – feste Spielwerte, Debugoptionen und Assetpfade
- `levels/` – Aufbau und Laden der Leveldaten
- `ui/` – DOM-Dialoge, Start- und Endbildschirme
- `utils/` – kleine wiederverwendbare Hilfsfunktionen

Klassen gehören ausschließlich unter `classes/`. `script.js` bleibt der
kleine Einstiegspunkt und enthält keine Gameplaylogik.

## Konfigurationsregeln

- Canvas-, Welt-, Timing-, Physik- und Debugwerte werden ausschließlich aus
  `config/game-config.js` gelesen.
- Neue Grundwerte werden im passenden Bereich von `GAME_CONFIG` ergänzt,
  anstatt als Magic Number in Spiellogik aufzutauchen.
- Der Debugmodus und einzelne Debuganzeigen werden nur über
  `GAME_CONFIG.debug` geschaltet.
- Assetordner werden ausschließlich in `config/asset-paths.js` eingetragen.
- Vollständige Dateipfade werden mit `getAssetPath()` gebaut. So bleiben
  Ordnerwechsel auf eine zentrale Stelle begrenzt.
