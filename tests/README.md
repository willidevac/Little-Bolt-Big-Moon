# Teststrategie

Die QA-Suite kombiniert kleine Verhaltenstests, Integrationsprüfungen und
statische Architekturverträge. `qa-final-acceptance.mjs` entdeckt alle
eigenständigen `qa-*.mjs`-Dateien automatisch und führt sie als Release-Gate
aus.

## Testebenen

- **Core:** Zustandsautomat, Game Loop, Eingabe, Ressourcen und Wertung
- **Gameplay:** Physikroute, Gegner, Waffen, Bosse und Plattformmechaniken
- **Integration:** kompletter Run-Lebenszyklus, UI, Audio und Speicherung
- **Architektur:** Importe, Composition Root, Dateigrenzen und Runtime-Assets
- **Darstellung:** responsive Verträge, HUD, Story und Assetabmessungen

## Befehle

```bash
npm test
npm run test:quick
npm run test:architecture
npm run test:release
```

Die Quelltextprüfungen ersetzen keine Verhaltenstests. Sie sichern nur Regeln,
die sich zuverlässig statisch prüfen lassen, beispielsweise verbotene globale
Zustände oder unerlaubte Abhängigkeitsrichtungen.
