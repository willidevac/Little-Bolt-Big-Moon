# Tutorial-Konzept

## Ziel

Das Tutorial ist ein öffentlich erreichbarer, kurzer Vertical Slice des
Hauptspiels. Es zeigt ungeübten Spielern und Prüfern innerhalb von drei bis
fünf Minuten die zentralen Systeme, ohne die Schwierigkeit oder den Aufbau des
Hauptspiels zu verändern.

Das Tutorial verwendet echte Produktionssysteme. Charaktersteuerung, Physik,
Kollisionen, Plattformen, Sammelobjekte, Waffen und Gegner werden nicht
dupliziert oder vereinfacht nachgebaut. Nur Levelgeometrie, Gegnerwerte,
Hinweisreihenfolge und Rücksetzpunkte erhalten tutorialeigene Konfigurationen.

## Produktentscheidung

- Das Hauptmenü erhält einen sichtbaren Eintrag `Tutorial – empfohlen`.
- Das Tutorial bleibt freiwillig und jederzeit wiederholbar.
- Beim ersten Besuch wird der Eintrag hervorgehoben und zuerst fokussiert.
- Der normale Spielstart und der versteckte Review-Modus bleiben unverändert.
- Das Tutorial speichert weder Rekorde noch Laufstatistiken.
- Der Abschluss kann lokal gespeichert werden, damit die Empfehlung danach
  nicht mehr hervorgehoben werden muss.

## Welt und Dauer

| Eigenschaft | Festlegung |
| --- | --- |
| Weltbreite | 1.280 Weltpixel |
| Welthöhe | ungefähr 1.600 Weltpixel |
| Landschaft | Schrottplatz |
| Zieldauer | drei bis fünf Minuten |
| Spielerstart | sicherer Boden im unteren Weltbereich |
| Abschluss | sichtbare Zielplattform im oberen Weltbereich |
| Scheitern | Rücksetzung zum letzten Tutorial-Checkpoint |

Die Route wechselt innerhalb der verfügbaren Breite mehrfach zwischen links
und rechts. Dadurch entsteht trotz der geringen Höhe genügend Wegstrecke für
mehrere kurze Übungen.

## Räumliche Aufteilung

| Höhenbereich | Inhalt | Erfolgskriterium |
| --- | --- | --- |
| 1.450–1.600 | Bewegung und Blickrichtung | links und rechts bewegt |
| 1.200–1.450 | kurzer und geladener Sprung | beide Sprungarten ausgeführt |
| 950–1.200 | einfacher Wandabsprung | Zielplattform erreicht |
| 650–950 | Plattformmechaniken | sicheren Mechanikpfad abgeschlossen |
| 350–650 | Bolzenwerfer und Kampf | Übungsziel und Gegner besiegt |
| 100–350 | Abschluss | Zielplattform erreicht |

Die Bereiche sind Richtwerte. Erreichbarkeit und Kameralesbarkeit entscheiden
bei der Umsetzung über die endgültigen Koordinaten.

## Lernfolge

### 1. Bewegung

- Das HUD zeigt nur die aktuelle Bewegungsanweisung.
- Tastatur- und Touchtexte verwenden dieselben Eingabeaktionen wie das Spiel.
- Byte muss sich mindestens einmal nach links und rechts bewegen.
- Die sichtbare Spiegelung demonstriert die Blickrichtung.

### 2. Präzisionssprung

- Eine breite Plattform erklärt zuerst einen kurzen Sprung.
- Eine zweite Plattform verlangt einen deutlich geladenen Sprung.
- Die Ladeanzeige des Hauptspiels bleibt unverändert aktiv.
- Ein Fehlsprung führt ohne Höhenverlust zum Abschnittsanfang zurück.

### 3. Wandabsprung

- Eine kurze, breite Wandpassage nutzt die echte Wandkollision.
- Der Hinweis erklärt die feste Flugbahn eines normalen Präzisionssprungs.
- Die begrenzte Richtungskorrektur nach dem Wandabprall wird ausdrücklich
  erklärt, damit sie nicht mit allgemeiner Luftsteuerung verwechselt wird.

### 4. Plattformmechaniken

- Eine Federplattform demonstriert einen automatischen Startimpuls.
- Eine Fallplattform zeigt Warnung, Fall und Respawn.
- Eine Fallenplattform erklärt sichere, warnende und aktive Phase.
- Eine Kranplattform ist optional und entfällt, falls sie die kompakte Route
  unübersichtlich macht.

### 5. Sammelobjekt und Waffe

- Der Bolzenwerfer liegt gut sichtbar auf einem sicheren Boden.
- Angriffshinweise erscheinen erst nach der Waffenaufnahme.
- Ein ungefährliches Übungsziel bestätigt Treffer und Projektilrichtung.
- Der Waffenwechsel wird nur erklärt, wenn mindestens zwei Waffen verfügbar
  sind; andernfalls bleibt er außerhalb des Tutorialumfangs.

### 6. Kampf

- Ein Schrottkrabbler führt Bodengegner, Treffer und Rückstoß ein.
- Eine langsame Drohne führt fliegende Gegner und Projektile ein.
- Tutorialgegner verwenden vorhandene Gegnerklassen mit eigenen, milden
  Konfigurationswerten.
- Ein verlorener Kampf startet nur den Kampfbereich neu.

### 7. Abschluss

Der Abschlussdialog bestätigt das Tutorial und bietet:

- `Hauptspiel starten`
- `Tutorial wiederholen`
- `Zum Hauptmenü`

Zusätzlich nennt er die Inhalte, die erst im Hauptspiel folgen: fünf Biome,
Upgrades, weitere Waffen, schwierigere Begegnungen und der Mondwächter.

## Wiederverwendete Inhalte

Es werden keine neuen Rastergrafiken, Animationen oder Audiodateien erstellt.
Vorgesehen sind ausschließlich vorhandene Inhalte:

- Schrottplatz-Hintergrund, Boden, Wände und Plattformen
- Byte mit bestehenden Bewegungs-, Sprung- und Angriffsanimationen
- vorhandene Lade-, Treffer- und Projektil-Effekte
- Bolzenwerfer und Bolzenprojektil
- Schrottkrabbler und Drohne
- Feder-, Fall-, Fallen- und optional Kranplattform
- bestehende HUD-, Dialog-, Button- und Fokusgestaltung
- bestehende Musik und Effekte des Schrottplatzes

## Tutorialzustände

Der geplante `TutorialDirector` besitzt eine lineare, explizite Zustandsfolge:

```text
movement
  → shortJump
  → chargedJump
  → wallRebound
  → platformMechanics
  → weaponPickup
  → practiceTarget
  → combat
  → completed
```

Fortschritt wird über vorhandene Eingabe- und Gameplay-Ereignisse erkannt.
Charakter-, Waffen-, Gegner- und Plattformklassen dürfen keine Abhängigkeit zum
Tutorial erhalten. Tutorialzustand bleibt damit eine äußere Orchestrierung.

## Technische Grenzen

- `createTutorialLevel()` erfüllt denselben Levelvertrag wie `createLevelOne()`.
- Levelauswahl erfolgt zentral in der Composition Root oder einer Level-Factory.
- `Game`, `World` und Kernsysteme erhalten keine verteilten Tutorialabfragen.
- Hinweise verwenden Übersetzungsschlüssel für Deutsch und Englisch.
- Event-Listener und Abonnements werden beim Verlassen vollständig entfernt.
- Checkpoints speichern nur Tutorialabschnitt und Position, keinen Weltzustand.
- Das Hauptlevel darf durch Tutorialkonfiguration weder importiert noch mutiert
  werden.

## Nicht-Ziele

- kein Ersatz für den Review-Modus
- kein alternatives leichtes Hauptspiel
- kein vollständiger Bosskampf
- keine Demonstration sämtlicher Upgrades und Sammelobjekte
- keine neue allgemeine Luftsteuerung
- keine neuen Designs oder Assets
- keine Änderung des bestehenden Hauptspiel-Balancings

## Verbindliche Abnahmekriterien

Das Tutorial gilt erst als abgeschlossen, wenn alle folgenden Punkte erfüllt
und automatisiert oder sichtbar geprüft sind:

1. Der Menüpunkt ist ohne Geheimcode sichtbar und per Tastatur sowie Touch
   erreichbar.
2. Deutsch und Englisch enthalten vollständige Tutorialtexte.
3. Das Tutorial startet in einer eigenen ungefähr 1.600 Pixel hohen Welt.
4. Bewegung nach links und rechts aktualisiert sichtbar Bytes Blickrichtung.
5. Kurzer Sprung, geladener Sprung und Wandabsprung sind mit normaler Physik
   erreichbar.
6. Mindestens Feder-, Fall- und Fallenplattform werden sicher demonstriert.
7. Der Bolzenwerfer wird vor der ersten Kampfaufgabe aufgenommen.
8. Ein Schrottkrabbler und eine Drohne sind innerhalb weniger Minuten sichtbar
   und besiegbar.
9. Stürze und Niederlagen setzen nur zum letzten Tutorial-Checkpoint zurück.
10. Ein Tutoriallauf verändert weder Rekorde noch Hauptspielfortschritt.
11. Abschluss, Wiederholung, Hauptspielstart und Rückkehr zum Menü funktionieren.
12. Das normale Hauptlevel bleibt funktional und inhaltlich unverändert.
13. Der vollständige automatisierte Abnahmelauf bleibt grün.
14. Ein Browser-Smoke-Test durchläuft das Tutorial ohne Konsolenfehler.

## Clean-Code-Vertrag

Für jede folgende Tutorialaufgabe gelten die bestehenden Projektregeln:

- höchstens 14 Codezeilen pro Funktion
- JSDoc für alle benannten Funktionen und Methoden
- höchstens 400 relevante Codezeilen pro Produktionsdatei
- englische Bezeichner und konsistentes `camelCase`
- keine Debugausgaben, Wartungsmarker oder lockeren Vergleiche
- eine Verantwortung pro Klasse oder Modul
- keine duplizierte Produktionslogik
- keine neue Abhängigkeit entgegen der dokumentierten Architekturrichtung
- fokussierte Regressionstests zusammen mit jeder Funktionserweiterung

Nach jeder der zehn Umsetzungsaufgaben werden die relevanten Tests ausgeführt.
Commit und Push erfolgen erst nach ausdrücklicher Freigabe.
