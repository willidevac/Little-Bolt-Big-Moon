# Visuelle Freigaben

Diese Datei hält verbindliche Designentscheidungen fest. Freigabebilder sind
Konzeptreferenzen und noch keine direkt im Spiel verwendbaren Spritesheets.

## Byte und Luma

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kantig, robust und werkstattgebaut |
| Masterdatei | `img/concepts/approvals/byte-luma-master-v1.png` |
| Produktionsraster | 32 × 32 px pro Frame |

Verbindliche Merkmale:

- Byte besitzt einen breiten eckigen Bildschirmkopf, kurze stabile Gliedmaßen,
  große Arbeitsstiefel, Rostorange, Anthrazit und eine schiefe Antenne.
- Luma verwendet dasselbe Grundchassis in Creme und Mondblau mit gerader
  Antenne.
- Beide besitzen cyanfarbene Bildschirmaugen.
- Die beiden Brustabzeichen ergeben zusammen einen vollständigen Mond.
- Verschleiß bleibt sichtbar, darf die Silhouette aber nicht unruhig machen.
- Linke Blickrichtung wird später aus der rechten Masterrichtung gespiegelt.

## Gegner

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kantige, silber-blaue Mond-Sicherheitsmaschinen |
| Masterdatei | `img/concepts/approvals/enemies-master-v1.png` |
| Produktionsraster | Krabbler/Drohne 48 × 32 px, Boss 96 × 96 px |

Verbindliche Merkmale:

- Alle Gegner gehören sichtbar zum selben alten Mond-Sicherheitsprogramm.
- Silber, Anthrazit und Mondblau bilden die Rüstung; Rot markiert Gefahr,
  Angriff und Energiekern.
- Der Schrottkrabbler bleibt niedrig, vierbeinig und von oben gut stompbar.
- Die Drohne besitzt kurze Flügel, seitliche Waffenmodule und einen sichtbaren
  unteren Schubstrahl.
- Der Mondwächter besitzt einen roten Kern, zwei Schulterwaffen, massive
  Fäuste und kurze stabile Beine.
- Die Gegner wirken technisch bedrohlich, aber nicht organisch oder grausam.

## Waffen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kompakte creme-mondblaue Missionsausrüstung |
| Masterdatei | `img/concepts/approvals/weapons-master-v1.png` |
| Produktionsraster | Waffen 32 × 32 px, Projektil 16 × 8 px |

Verbindliche Merkmale:

- Reparaturschlüssel, Bolzenwerfer, Projektil und Munitionsbehälter gehören
  sichtbar zu einem gemeinsamen Set.
- Creme und Mondblau bilden die Außenhülle, Anthrazit die Mechanik und Cyan
  die Energieanzeigen.
- Leichte Kratzer zeigen das Alter der Ausrüstung, ohne sie wie
  Schrottplatz-Eigenbauten wirken zu lassen.
- Der Reparaturschlüssel bleibt als Werkzeug erkennbar.
- Der Bolzenwerfer ist ein kompakter mechanischer Launcher und keine
  realistische Schusswaffe.

## Collectibles

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | orange-dunkelgraue Missions- und Schrottplatzfunde |
| Masterdatei | `img/concepts/approvals/collectibles-master-v1.png` |
| Produktionsraster | Collectibles 16 × 16 oder 24 × 24 px, Waffenfund 32 × 32 px |

Verbindliche Merkmale:

- Punktemarke, Energiezelle, Bolzenmunition und die beiden Abzeichenhälften
  verwenden Rostorange, Anthrazit und cyanfarbene Energie.
- Der Waffenfund gehört optisch zu diesem Collectible-Set. Das separat
  freigegebene Waffen-Set bleibt dennoch creme-mondblau.
- Die beiden Abzeichenhälften bilden zusammen einen cyanfarbenen Mond.
- Alle Gegenstände benötigen auch in kleiner Darstellung eine eindeutige
  Silhouette und dürfen nicht nur durch ihre Farbe unterscheidbar sein.
- Das Masterblatt ist eine Konzeptreferenz und noch kein direkt einsetzbares
  Spritesheet.

## Hintergrundzonen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | zusammenhängender vertikaler Aufstieg vom Schrottplatz bis zum Mond |
| Masterdatei | `img/concepts/approvals/background-zones-master-v1.png` |
| Produktionsaufbau | pro Zone getrennte Parallax-Ebenen |

Verbindliche Merkmale:

- Die fünf Zonen sind Schrottplatz, verlassene Roboterfabrik, Startturm mit
  Wolken, Raumstation sowie Mond mit Sicherheitsanlage.
- Die Farbdramaturgie entwickelt sich von warmem Rostorange über Violett und
  tiefes Weltraumblau bis zu kaltem Mondlicht.
- Jede Zone nutzt Vordergrund, spielnahe Architektur und einen ruhigeren
  Fernhintergrund als getrennte Tiefenebenen.
- Die Komposition unterstützt vertikales Klettern und verwendet zugleich die
  gesamte Breite des Canvas.
- Leere Transportvorrichtungen, Produktionsanlagen, Missionskisten, Antennen
  und ein cyanfarbenes Signal erzählen Bytes Weg ohne erklärenden Text.
- Das Masterbild legt Atmosphäre und Formsprache fest. Die späteren
  Runtime-Hintergründe werden separat und für nahtloses Scrollen produziert.

## Schrottplatz-Hintergrund

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | warme, dichte Schrottlandschaft mit klarer vertikaler Route |
| Masterdatei | `img/concepts/approvals/scrapyard-background-master-v1.png` |
| Runtime-Zieldateien | `scrapyard-far.png`, `scrapyard-mid.png`, `scrapyard-near.png` |
| Runtime-Größe | jeweils 320 × 360 px, vierfach skaliert |

Verbindliche Merkmale:

- Der Fernhintergrund besteht aus staubigem Himmel, Rauch, Schornsteinen,
  Kränen und der verlassenen Fabrik als sichtbarem Ziel.
- Die mittlere Ebene trägt Schrottberge, alte Maschinen, Container und
  Gerüste, bleibt hinter den möglichen Sprungrouten aber kontrastarm.
- Die nahe Ebene rahmt nur die Außenkanten mit dunklen Rohren, Kabeln,
  Ketten und Kranhaken.
- Der Spielbereich bleibt in der Mitte sowie auf beiden Seiten ausreichend
  ruhig und unterstützt mehrere Wege nach oben.
- Die leere Transporthalterung, cremefarbene Missionsreste mit Mondzeichen
  und ein schwaches cyanfarbenes Signal erzählen Bytes Ausgangslage.
- Die Helligkeit nimmt zur Fabrik hin leicht zu und macht den Aufstieg trotz
  der einsamen Grundstimmung hoffnungsvoll.

## Fabrik-Hintergrund

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | verlassene vertikale Roboterfabrik mit zwei getrennten Montagelinien |
| Masterdatei | `img/concepts/approvals/factory-background-master-v1.png` |
| Runtime-Zieldateien | `factory-far.png`, `factory-mid.png`, `factory-near.png` |
| Runtime-Größe | jeweils 320 × 360 px, vierfach skaliert |

Verbindliche Merkmale:

- Der Fernhintergrund zeigt hohe dunkle Fabrikschächte, Fenster, vertikale
  Träger und vereinzeltes Ofenlicht mit geringerem Kontrast.
- Die mittlere Ebene trägt Förderbänder, stillgelegte Montagearme, Kräne,
  Transportstrecken und zwei nebeneinanderliegende Montageplätze.
- Orange und creme-mondblaue Fertigungswege sowie zwei zusammengehörige
  Mondhälften zeigen, dass Byte und Luma als Paar hergestellt wurden.
- Ein aussortierter orangefarbener Produktionsweg und eine zum Ausgang
  transportierte cremefarbene Missionskiste zeigen die spätere Trennung.
- Die nahe Ebene rahmt den Spielraum mit dunklen Kabeln, Ketten, Kolben,
  Rohren und angeschnittenen Maschinenarmen.
- Der untere Eingang übernimmt warmes Licht vom Schrottplatz. Nach oben wird
  die Fabrik heller und kühler und öffnet sich sichtbar zum Startturm.

## Startturm-Hintergrund

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | gewaltiger Startturm vom Fabrikdach bis in die obere Atmosphäre |
| Masterdatei | `img/concepts/approvals/launch-tower-background-master-v1.png` |
| Runtime-Zieldateien | `launch-tower-far.png`, `launch-tower-mid.png`, `launch-tower-near.png` |
| Runtime-Größe | jeweils 320 × 360 px, vierfach skaliert |

Verbindliche Merkmale:

- Der Fernhintergrund wechselt von einer warmen Industriesilhouette über
  pfirsichfarbene und violette Wolken zu tiefblauem Sternenhimmel.
- Die mittlere Ebene zeigt das modulare Turmgerüst, Aufzugsschächte,
  Versorgungsleitungen, Antennen und Missionsschienen.
- Zwei getrennte Startwege erzählen Lumas alleinigen Start: Die orange
  Strecke ist beschädigt und zurückgelassen, die creme-mondblaue Strecke
  führt mit cyanfarbenen Signalen nach oben.
- Die nahe Ebene rahmt den Spielraum mit dunklen Streben, Kabeln, Rohren,
  Warnlichtern und angeschnittenen Wartungselementen.
- Nach oben werden Konstruktion und Licht kühler und sauberer. Sterne und die
  entfernte Raumstation machen das nächste Ziel früh sichtbar.
- Die Zone nutzt die gesamte Breite, behält aber mehrere ruhige vertikale
  Kletterkanäle für Plattformen, Aufzüge, Wind und Gegner.

## Raumstations-Hintergrund

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | verlassener orbitaler Wartungskomplex mit erwachender Sicherheit |
| Masterdatei | `img/concepts/approvals/space-station-background-master-v1.png` |
| Runtime-Zieldateien | `space-station-far.png`, `space-station-mid.png`, `space-station-near.png` |
| Runtime-Größe | jeweils 320 × 360 px, vierfach skaliert |

Verbindliche Merkmale:

- Der Fernhintergrund zeigt tiefblauen Weltraum, die Erde unterhalb der
  Station, den Mond oberhalb und kleine entfernte Satelliten.
- Die mittlere Ebene besteht aus Stationsringen, Wartungsmodulen, Antennen,
  Solartechnik, Frachtschienen und offenen Verbindungen.
- Eine cyanfarbene Missionsspur, creme-mondblaue Halterungen und ein leerer
  Kapselplatz zeigen Lumas Weg zum Mond.
- Ein geteilter Zugangsscanner akzeptiert die cremefarbene Mondhälfte,
  während die beschädigte orange Hälfte rot abgelehnt wird.
- Rote Warnlichter und alte Sicherheitsschotts werden nach oben hin aktiver,
  ohne die Anlage absichtlich böse wirken zu lassen.
- Dunkle Rumpfkanten, Kabel, Luftschleusen und Scannerrahmen bilden die nahe
  Ebene und lassen mehrere offene Kletter- und Kampfwege frei.

## Mond-Hintergrund und Bossarena

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | Mondaufstieg durch eine alte Sicherheitsanlage bis zur offenen Bossarena |
| Masterdatei | `img/concepts/approvals/moon-background-master-v1.png` |
| Runtime-Zieldateien | `moon-far.png`, `moon-mid.png`, `moon-near.png` |
| Runtime-Größe | jeweils 320 × 360 px, vierfach skaliert |

Verbindliche Merkmale:

- Der Fernhintergrund zeigt tiefblauen Sternenhimmel, die große blaue Erde,
  entfernte Mondberge und einen ruhigen Kraterhorizont.
- Der untere Bereich enthält eine beschädigte Missionskapsel, verstreute
  cremefarbene Fracht und verlassene Mondtechnik.
- Die mittlere Ebene führt durch Krater, Antennenfelder, Scanner, Türme und
  eine silber-blaue Sicherheitsanlage mit roten Warnkernen.
- Die Bossarena ist deutlich breiter und ruhiger als der Aufstieg. Ihre Mitte
  bleibt für Mondwächter, Byte, Projektile und Ausweichbewegungen frei.
- Hinter der Arena liegt ein leerer creme-mondblauer Rettungsplatz für Luma
  mit unterbrochenem Stromkabel, Energiezellensockel und cyanfarbenem Signal.
- Orange und cremefarbene Mondhälften vervollständigen sich am abschließenden
  Aussichtspunkt vor der Erde.
- Byte, Luma und der Mondwächter werden nicht in den Hintergrund gezeichnet,
  sondern später als separate bewegliche Sprites eingesetzt.

## Plattformen, Tilesets und Gefahren

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | zonenspezifische 32-px-Module mit einheitlicher Gameplay-Lesbarkeit |
| Masterdatei | `img/concepts/approvals/tiles-hazards-master-v1.png` |
| Runtime-Zieldateien | fünf Tilesets mit je 32 Tiles und ein Gefahren-Set mit 16 Tiles |
| Produktionsraster | 32 × 32 px pro Tile |

Verbindliche Merkmale:

- Jede Zone besitzt linke, mittlere und rechte Plattformteile, Wand- und
  Eckmodule, Unterseiten, dünne Einwegplattformen und modulare Blockflächen.
- Bewegliche Plattformen besitzen unabhängig von der Zone eine eindeutige
  cyanfarbene Mechanik an der Unterseite.
- Zerfallende Plattformen zeigen drei zunehmend beschädigte Stufen mit
  breiteren Rissen und herunterfallenden Fragmenten.
- Sichere Laufkanten erhalten eine schmale helle Oberkante. Gefahr wird nie
  ausschließlich über Farbe, sondern zusätzlich über Form kommuniziert.
- Schrottplatz, Fabrik, Startturm, Raumstation und Mond behalten ihre
  freigegebenen Materialien und Paletten, teilen aber dieselben Maße.
- Das gemeinsame Gefahren-Set enthält vier Stufen für Stacheln, elektrische
  Bodenknoten, Warnleuchten und das Arenator.
- Cyan markiert Energie und Bewegung, Amber Vorsicht und Rot eine unmittelbar
  aktive Gefahr.

## Storyobjekte und interaktive Requisiten

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | wortlose Missionsspuren mit klaren Interaktionszuständen |
| Masterdatei | `img/concepts/approvals/story-props-master-v1.png` |
| Produktionsraster | je nach Objekt 64 × 64, 64 × 96 oder 96 × 64 px |

Verbindliche Merkmale:

- Die Transporthalterung besteht aus zwei sichtbar verbundenen Plätzen. Bytes
  orange Seite ist beschädigt, Lumas creme-mondblaue Seite ist leer und zeigt
  gelöste Halteklammern.
- Das Fabrikmotiv nutzt nur Piktogramme: zwei Robotersilhouetten, eine schiefe
  und eine gerade Antenne, zusammengehörige Mondhälften und zwei Wege, die
  sich nach oben trennen.
- Lumas Missionskiste besitzt creme-mondblaue Flächen, dunkle Eckschützer,
  einen cyanfarbenen Status und ihre Mondhälfte.
- Der Signalgeber behält über vier Frames dieselbe Silhouette und entwickelt
  sich von dunkel über einen Cyanimpuls bis zum hellen vertikalen Signal.
- Der Energiezellensockel passt formgenau zur freigegebenen Energiezelle und
  zeigt in vier Frames Einsetzen, Energiefluss und vollständigen Mondglanz.
- Orange verbindet Objekte mit Byte und seiner Aussortierung, Creme-Mondblau
  mit Luma und der offiziellen Mission, Cyan mit Energie und Hoffnung.

## Gameplay-Effekte

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kompakte, farbcodierte Pixel-Effekte mit klarer Trefferreaktion |
| Masterdatei | `img/concepts/approvals/gameplay-vfx-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/effects/gameplay-effects.png` |
| Produktionsraster | 32 × 32 px pro Frame, insgesamt 23 Frames |

Verbindliche Merkmale:

- Sprungstaub besitzt vier kurze creme-graue Frames und verdeckt Bytes Füße
  nur am stärksten Kontaktpunkt.
- Der Trefferblitz besitzt vier Frames mit weißem Kern, orange-roten Spitzen
  und wenigen quadratischen Fragmenten.
- Der Bolzenwerfer verwendet drei gerichtete cyan-weiße Impulsframes ohne
  realistische Mündungsflamme.
- Der Collectible-Glanz entwickelt sich in sechs Frames von einem Lichtpunkt
  zu Diamant, Ring und aufsteigenden quadratischen Partikeln.
- Die mechanische Explosion umfasst sechs ungiftige Arcade-Frames aus
  orangefarbener Energie, Graphitfragmenten, Pixelrauch und Glut.
- Alle Effekte bleiben sowohl vor dunklem Weltraumblau als auch vor warmem
  Schrottplatzbraun eindeutig erkennbar.

## HUD und Menüs

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kompakte industrielle Pixel-Oberfläche mit freier Spielfeldmitte |
| Masterdatei | `img/concepts/approvals/ui-hud-menus-master-v1.png` |
| Zielauflösung | 1280 × 720 px |

Verbindliche Merkmale:

- Energie steht links oben, Höhe und Zonenfortschritt mittig oben, Punkte und
  Pause rechts oben. Waffen und Munition liegen links unten.
- Drei kleine Upgrade-Sockel liegen rechts unten und verwenden dieselben
  Symbole wie die Auswahlkarten.
- Die Bossenergie besitzt einen silber-blauen Rahmen, roten Kern und klar
  segmentierte rote Füllung.
- Upgrade-Auswahl, Pause und Absturz verwenden dunkle Nine-Slice-Panels mit
  cremefarbener Kante und cyanfarbener Fokusmarkierung.
- Touch-Tasten sind 48 × 48 px groß, halbtransparent und besitzen einen
  eindeutigen cyanfarbenen gedrückten Zustand. Auf Desktop bleiben sie aus.
- HUD- und Menütexte verwenden die lokale Silkscreen-Schrift. Begriffe bleiben
  kurz und deutsch: `UPGRADE`, `PAUSE`, `ABSTURZ`, `WEITER`, `NEUSTART`,
  `MENÜ` und `NOCHMAL`.
- Die Oberfläche bleibt sowohl vor warmen unteren Zonen als auch vor dunklem
  Weltraum deutlich lesbar und hält die Spielfeldmitte frei.

## Byte-Animationen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | robuste, klar lesbare Bewegungen mit mechanischem Gewicht |
| Masterdatei | `img/concepts/approvals/byte-animation-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/characters/byte.png` |
| Produktionsraster | 32 × 32 px pro Frame, insgesamt 33 Frames |

Verbindliche Merkmale:

- Byte behält in jeder Pose seinen breiten rost-orangen Körper, die großen
  Arbeitsstiefel, das Halbmond-Abzeichen und die geknickte Antenne.
- Die 33 Frames gliedern sich in vier Leerlauf-, sechs Lauf-, einen Sprung-,
  einen Fall-, zwei Lande-, vier Nahkampf-, drei Schuss-, zwei Treffer-, vier
  Ruhe- und sechs mechanische Ausschaltframes.
- Die Laufanimation zeigt einen vollständigen, energischen Zyklus. Sprung,
  Fall und Landung bleiben trotz des kleinen Rasters klar unterscheidbar.
- Im Nahkampf verwendet Byte den creme-mondblauen Reparaturschlüssel, beim
  Schießen den Bolzenwerfer. Beide entsprechen dem freigegebenen Waffenmaster.
- Treffer, Staub und Mündungsimpuls folgen dem freigegebenen VFX-Master und
  bleiben klein genug, um Bytes Silhouette nicht zu verdecken.
- Die Ausschaltsequenz ist mechanisch und vollständig gewaltfrei: Taumeln,
  kontrollierter Fall, schwacher Antennenfunke und erloschener Bildschirm.
- Die Produktionssprites blicken nach rechts. Bewegungen nach links werden
  später im Canvas gespiegelt.

## Luma-Animationen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | ruhige, schwerelose Bewegungen mit hoffnungsvollem Energieaufbau |
| Masterdatei | `img/concepts/approvals/luma-animation-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/characters/luma.png` |
| Produktionsraster | 32 × 32 px pro Frame, insgesamt 10 Frames |

Verbindliche Merkmale:

- Luma behält in jeder Pose ihre creme-mondblaue Lackierung, die gerade
  Antenne, den cyanfarbenen Antennenkopf und ihre Mondhälfte.
- Die zehn Frames gliedern sich in einen ausgeschalteten, vier schwebende
  Leerlauf- und fünf Wiederbelebungsframes.
- Der Leerlauf bildet einen sanften Schwebezyklus aus Höhenbewegung,
  kleiner Armgegenbewegung, einmaligem Blinzeln und dezentem Licht unter den
  Füßen.
- Die Wiederbelebung beginnt mit dunklem Bildschirm und dunkler Antenne.
  Cyanenergie läuft vom Brustabzeichen über den Bildschirm bis zur Antenne.
- Der stärkste Energieimpuls verwendet nur wenige quadratische Partikel und
  verdeckt Lumas Silhouette nicht.
- Die letzte Wiederbelebungspose geht direkt in das freigegebene Schweben
  über und kann deshalb ohne sichtbaren Sprung in die Leerlaufanimation wechseln.

## Schrottkrabbler-Animationen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | niedriger vierbeiniger Gegner mit deutlich angekündigtem Vorstoß |
| Masterdatei | `img/concepts/approvals/scrap-crawler-animation-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/enemies/scrap-crawler.png` |
| Produktionsraster | 48 × 32 px pro Frame, insgesamt 13 Frames |

Verbindliche Merkmale:

- Der Schrottkrabbler bleibt in jeder Pose breit, niedrig, vierbeinig und von
  oben eindeutig stompbar.
- Die 13 Frames gliedern sich in vier Lauf-, drei Angriffs-, zwei Treffer- und
  vier mechanische Ausschaltframes.
- Beim Laufen wechseln die vier Beine in einem vollständigen Zyklus, während
  der gepanzerte Körper nur leicht auf und ab federt.
- Vor dem kurzen Vorstoß leuchtet der rote Frontsensor deutlich heller und
  der Körper spannt sich sichtbar an.
- Treffer werden durch kleinen orangefarbenen Funkenschlag und klaren
  Rückstoß angezeigt, ohne die niedrige Silhouette zu verdecken.
- Beim Ausschalten knicken die Beine kontrolliert ein, der Körper sinkt ab
  und Sensor sowie Antenne erlöschen gewaltfrei.

## Drohnenwächter-Animationen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | kontrollierter Schwebeflug mit klar getrennter Warn- und Schussphase |
| Masterdatei | `img/concepts/approvals/drone-guard-animation-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/enemies/drone-guard.png` |
| Produktionsraster | 48 × 32 px pro Frame, insgesamt 20 Frames |

Verbindliche Merkmale:

- Der Drohnenwächter behält seinen kompakten silber-blauen Rumpf, die kurzen
  Flügel, seitliche Waffenmodule, zwei obere Finnen und den unteren roten
  Schubstrahl.
- Die 20 Frames gliedern sich in vier Leerlauf-, vier Flug-, drei Warn-, drei
  Angriffs-, zwei Treffer- und vier mechanische Ausschaltframes.
- Der Leerlauf zeigt sanftes Schweben, während der Flug durch leichte
  Vorwärtsneigung und kurze Schubspuren klar davon unterscheidbar bleibt.
- In der Warnphase werden der rote Sensor und die seitlichen Waffenmodule
  stufenweise heller. Erst danach wird ein einzelner roter Energiebolzen
  abgefeuert.
- Treffer verursachen kleinen orangefarbenen Funkenschlag und sichtbares
  Zurückkippen, gefolgt von einer Stabilisierung.
- Beim Ausschalten stottert der Schub, die Drohne verliert kontrolliert Höhe,
  zeigt einen kleinen internen Energieausbruch und bleibt dunkel liegen.

## Mondwächter-Animationen

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben |
| Datum | 23.07.2026 |
| Richtung | schwerer Sicherheitsboss mit zwei klar unterscheidbaren Angriffen |
| Masterdatei | `img/concepts/approvals/moon-warden-animation-master-v1.png` |
| Runtime-Zieldatei | `img/sprites/enemies/moon-warden.png` |
| Produktionsraster | 96 × 96 px pro Frame, insgesamt 26 Frames |

Verbindliche Merkmale:

- Der Mondwächter behält seinen breiten silber-blauen Körper, den roten Kern,
  beide Schulterwaffen, übergroße Fäuste und kurze stabile Beine.
- Die 26 Frames gliedern sich in vier Leerlauf-, vier Lauf-, fünf Nahkampf-,
  fünf Fernkampf-, zwei Treffer- und sechs Deaktivierungsframes.
- Die Leerlaufanimation bewegt Fäuste und Servos nur leicht, während der rote
  Kern langsam pulsiert. Der Lauf wirkt schwer und besitzt klar gesetzte Füße.
- Der Nahkampf zeigt Ausholen, Faustschlag, kleinen Bodeneinschlag und
  vollständige Erholung. Der Fernkampf öffnet zuerst die Schulterwaffen und
  feuert erst nach sichtbarer roter Aufladung einen einzelnen Energiebolzen.
- Treffer verursachen einen kleinen orangefarbenen Rüstungsfunken und
  schweren Rückstoß, ohne die Bossform aufzubrechen.
- Die Deaktivierung beendet den veralteten Schutzbefehl: Der Kern flackert,
  der Wächter sinkt auf ein Knie, legt die Fäuste ab und bleibt vollständig
  erhalten mit erloschenem Kern stehen.

## Byte-Runtime-Spritesheet

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben und integriert |
| Datum | 23.07.2026 |
| Produktionsmuster | `img/concepts/approvals/byte-production-layout-v1.png` |
| Runtime-Datei | `img/sprites/characters/byte.png` |
| Dateigröße | 256 × 160 px |
| Raster | 8 × 5 Zellen mit jeweils 32 × 32 px |
| Verarbeitung | JavaScript/Node, Chroma-Key und Nearest-Neighbor |

Verbindliche Merkmale:

- Die ersten 33 Zellen enthalten in Manifest-Reihenfolge Idle, Run, Jump,
  Fall, Land, Melee, Shoot, Hurt, Sleep und Dead.
- Die letzten sieben Zellen sind vollständig transparent und bleiben als
  unbenutzte Reserve außerhalb aller Animationen.
- Jede belegte Zelle enthält genau eine Pose. Figuren und Effekte überschreiten
  keine Zellgrenze.
- Hintergrund und Hilfsraster wurden per JavaScript entfernt. Die Skalierung
  auf 32 × 32 px verwendet ausschließlich Nearest-Neighbor.
- Die Runtime-PNG besitzt einen Alpha-Kanal und wurde auf 33 belegte sowie
  sieben leere Zellen geprüft.
- Im Repository und im Spiel werden für diesen Arbeitsschritt keine
  Python-Dateien oder Python-Abhängigkeiten verwendet.

## Luma-Runtime-Spritesheet

| Feld | Freigabe |
| --- | --- |
| Status | freigegeben und integriert |
| Datum | 23.07.2026 |
| Produktionsmuster | `img/concepts/approvals/luma-production-layout-v1.png` |
| Runtime-Datei | `img/sprites/characters/luma.png` |
| Dateigröße | 160 × 64 px |
| Raster | 5 × 2 Zellen mit jeweils 32 × 32 px |
| Verarbeitung | JavaScript/Node, Chroma-Key und Nearest-Neighbor |

Verbindliche Merkmale:

- Zeile eins enthält einen vollständig ausgeschalteten Frame und vier
  schwebende Leerlaufframes.
- Zeile zwei enthält die fünfstufige Wiederbelebung von dunklem Zustand bis
  zum stabilen Schweben.
- Alle zehn Zellen sind belegt und enthalten jeweils genau eine Luma-Pose.
- Für die Hintergrundentfernung wurde Magenta verwendet, damit sämtliche
  cyanfarbenen Energieeffekte erhalten bleiben.
- Sehr helle und sehr dunkle Magenta-Randpixel wurden per JavaScript entfernt.
  Die Runtime-PNG besitzt einen geprüften Alpha-Kanal.
- Im Repository und im Spiel werden für diesen Arbeitsschritt keine
  Python-Dateien oder Python-Abhängigkeiten verwendet.
