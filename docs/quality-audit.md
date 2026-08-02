# Qualitäts- und Sichtprüfung

Stand: 2. August 2026

## Prüfumfang

Die komplette 150.000-Pixel-Welt wurde im Review-Modus in Abständen von
ungefähr 600 Weltpixeln betrachtet. Geprüft wurden alle fünf Landschaften,
ihre Übergänge, Plattformen, Gegner, Sammelobjekte, Storyobjekte,
Zwischenbosse und die Mondarena. Zusätzlich wurden Hauptmenü, HUD, Dialoge,
deutsche und englische Texte sowie 320, 568, 844, 1024, 1280 und 1440 Pixel
breite Ansichten kontrolliert.

## Gefundene und behobene Abweichungen

| ID | Beobachtung | Behebung |
| --- | --- | --- |
| VIS-001 | Zehn Funde schwebten sichtbar oberhalb ihrer nächsten Plattform. | Alle Funde besitzen jetzt eine geprüfte "anchorPlatformId" und werden aus der Plattformoberkante positioniert. |
| VIS-002 | Funde auf beweglichen Plattformen blieben bei deren Bewegung zurück. | "AnchoredCollectable" übernimmt die Framebewegung seiner Plattform. |
| VIS-003 | Funde auf Fallplattformen konnten während deren unsichtbarer Wartezeit in der Luft stehen. | Fund und Kollision werden gemeinsam mit der Plattform ausgeblendet und beim Respawn zurückgesetzt. |
| VIS-004 | Storyobjekt-Höhen waren zusätzlich zur Plattform manuell in JSON gepflegt. | "StoryProp" berechnet die sichtbare Höhe nun aus seinem geprüften Anker. |
| UI-001 | Punkte, Kombo und Pause ragten bei 844 × 500 und 1024 × 600 rechts aus dem Spielbereich. | Die äußeren HUD-Spalten dürfen jetzt wirklich schrumpfen. |
| UI-002 | „Reparaturschlüssel“ wurde bei 568 × 320 abgeschnitten. | Der Waffenbereich besitzt eine eigene responsive Breite und kleinere Schrift. |
| UI-003 | Touch-Tasten überlagerten bei 844 und 1024 Pixeln den Ressourcenbereich und zogen die Höhenanzeige breit. | Touch-HUD und Tasten besitzen jetzt getrennte, kollisionsfreie Bereiche. |
| I18N-001 | Im englischen Steuerungsdialog blieb das deutsche Wort „oder“ stehen. | Das Wort besitzt jetzt einen eigenen deutschen und englischen Übersetzungsschlüssel. |
| REV-001 | Nach „Nochmal versuchen“ steuerte der Review-Flug noch die alte Spielfigur. | Der Controller verbindet den Flug bei einer neuen Welt automatisch erneut. |
| REV-002 | Die Landschaftsauswahl blieb beim freien Flug auf einem alten Eintrag stehen. | Die Auswahl folgt nun dem aktuellen Landschaftsabschnitt und der Bossarena. |
| HTML-001 | "index.html" enthielt rund 900 Zeilen und vermischte alle Oberflächen. | Fünf logisch benannte Fragmente und ein kleiner Loader halten den Einstieg kurz. |
| CODE-001 | Zehn deutsche Kommentare und Fehlermeldungen enthielten alte Zeichencodierungsreste. | Alle betroffenen Texte sind wieder korrektes UTF-8. |
| GAME-002 | Ein Zwischenboss erschien ohne eindeutige Textmeldung. | Eine priorisierte HUD-Mitteilung nennt den Boss auf Deutsch oder Englisch und bleibt für Screenreader lesbar. |
| GAME-003 | Der neue Biomweg wurde nach dem Boss still freigegeben. | HUD und barrierefreier Upgrade-Dialog melden jetzt ausdrücklich den geöffneten Aufstieg. |

## Korrigierte Fundstellen

- "launch-tower-energy-01"
- "launch-tower-ammo-01"
- "space-station-arc-cannon-01"
- "space-station-energy-01"
- "space-station-arc-charge-01"
- "space-station-ammo-01"
- "space-station-arc-charge-02"
- "space-station-boss-arc-charge"
- "moon-arc-charge-01"
- "moon-boss-arc-charge"

Zusätzlich wurden alle übrigen Funde auf dasselbe Ankerprinzip umgestellt,
damit spätere Positionsänderungen nicht erneut zu schwebenden Objekten führen.

## Ohne Abweichung geprüft

- Alle 15 Weltabschnitte besitzen einen lückenlosen Landschaftswechsel.
- Keine der geprüften Hintergrundebenen erzeugt einen sichtbaren harten Sprung.
- Die sechs Storyobjekte liegen innerhalb statischer Plattformgrenzen.
- Gegner, Zwischenbosse und der Mondboss stehen in ihren vorgesehenen Bereichen.
- Die Mondarena hält den Kampf im sichtbaren Bereich.
- Hauptmenü, Einstellungen, Steuerung, Impressum und Hochformathinweis bleiben bedienbar.
- Bei 320 Pixeln erscheint der verständliche Hinweis zum Drehen des Geräts.
- Bei 1280 und 1440 Pixeln wurden keine überstehenden HUD- oder Dialogelemente gefunden.

## Normalmodus und Balancing

Der normale Spielstart wurde sichtbar im Browser geprüft. Zusätzlich simuliert
`qa-normal-gameplay.mjs` jeden der 955 aufeinanderfolgenden Hauptsprünge mit den
echten Werten aus `GAME_CONFIG` in Ladungsschritten von 0,1 Prozent.

- Alle Hauptsprünge besitzen mindestens ein erreichbares Ladungsfenster.
- Die frühen Fabriksprünge verlangen keine nahezu perfekte Vollladung mehr.
- Die vier engsten Ladungsfenster bleiben als späte Mondherausforderung erhalten.
- Jeder Zwischenboss sperrt genau einen notwendigen Übergang zum nächsten Biom.
- Ohne freigegebenen Übergang existiert auch über Nebenrouten kein Sprung vorbei.
- Nach dem Bossabschluss erscheint der fehlende Schritt und ist sicher erreichbar.
- Die fünf Bosse benötigen mit vollem Bolzenmagazin und Reparaturschlüssel
  höchstens 7, 9, 9, 12 und 20 Treffer; die Lichtbogenkanone verkürzt späte Kämpfe.
- Alle 70 eigenständigen QA-Dateien laufen ohne Fehler durch.

## Clean-Code-Endaudit

Der gesamte Produktionscode wurde nach den verbindlichen Kursregeln geprüft.
Die größten JavaScript-Dateien bleiben mit 347 Zeilen für `Game`, 331 Zeilen
für `Character` und 291 Zeilen für `World` deutlich unter der festen Grenze.

- Keine JavaScript-Datei überschreitet 400 Zeilen.
- Keine erkannte Funktion überschreitet 14 Zeilen.
- Öffentliche Klassen und Methoden besitzen JSDoc.
- Produktionscode enthält keine Debugausgaben oder `debugger`-Anweisungen.
- Es existieren keine offenen `TODO`-, `FIXME`-, `HACK`- oder `XXX`-Marker.
- Produktionscode verwendet weder `var` noch lockere Gleichheitsvergleiche.
- Alle 111 Produktionsdateien besitzen verwendete und eindeutige Imports.
- Zustände, HUD-Feedback, Bodenbewegung, Run-Neustart, Weltaufbau und
  Laufwert-Synchronisierung besitzen getrennte Verantwortungen und eigene Tests.

## Release-Abnahme

Der zentrale Abnahmelauf findet jetzt jede eigenständige `qa-*.mjs`-Datei
automatisch. Neue Regressionstests können dadurch nicht mehr versehentlich aus
der Gesamtabnahme ausgeschlossen werden. Sechs unverzichtbare Spielerwege
werden zusätzlich als fester Vertrag bewacht:

- normaler Start, Pause, Fortsetzen, Niederlage, Sieg und Neustart
- versteckter Mentor-Modus inklusive Neustart einer frischen Welt
- gleichzeitige Touch-Eingaben und Tastatursteuerung
- deutsche und englische Oberfläche samt gespeicherter Auswahl
- responsive Darstellung von 320 bis 1440 Pixel
- vollständige lokale Runtime- und Assetpfade

Die zuvor fehlenden Prüfungen für HTML-Fragmente, verankerte Funde und den
Review-Neustart gehören damit ebenfalls verbindlich zur Gesamtabnahme.

## Automatische Sicherungen

- Jede JavaScript-Datei bleibt unter 400 Zeilen.
- Jede erkannte Funktion bleibt bei höchstens 14 Zeilen.
- Öffentliche Klassen und Methoden benötigen JSDoc.
- Wartungsmarker, `var`, lockere Vergleiche und unbenutzte Imports werden abgelehnt.
- Relative Importe und lokale Assets werden geprüft.
- IDs, ARIA-Bezüge, Buttons, Touchsteuerung und Übersetzungsschlüssel werden geprüft.
- Plattformroute, Bosse, Respawns, Storyobjekte und Sammelobjekte besitzen Regressionstests.
