# Klassenstruktur

Alle objektorientierten Bestandteile liegen in diesem Ordner. Jede Klasse
erhält genau eine Datei mit der Endung `.class.js`.

- `base/` – gemeinsame Zeichen- und Bewegungsgrundlagen
- `core/` – Spiel, Weltaufbau, Animationsloop, Entitätsregister und Kamera
- `entities/` – Charakter, Gegner, Waffen, Projektile und Sammelobjekte
- `environment/` – Plattformen und Hintergründe
- `systems/` – Figurensteuerung, Kampf, Laufablauf, Routen, Score und Audio
- `input/` – Tastatur- und Touchsteuerung
- `ui/` – Bildschirme, barrierefreie Dialoge, Status und HUD-Rückmeldungen

Konkrete Gegner- und Waffenklassen werden erst angelegt, wenn ihre
Basisklassen implementiert und getestet sind.
