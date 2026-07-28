# Audio

Das Produktionsset von `Little Bolt, Big Moon` verwendet ausschließlich
kostenlose CC0-Dateien. Die Quellen dürfen privat, in Lernprojekten und
kommerziell verwendet sowie verändert werden.

## Klangrichtung

- ruhige, hoffnungsvolle Aufstiegsmusik ohne hörbare Schleifenpause
- etwas angespanntere, aber zurückhaltende Bossmusik
- kurze digitale und metallische Gameplay-Rückmeldungen
- niedrigere Lautstärken, damit Musik und Effekte nicht nerven

## Struktur

- `sfx/`: ausgewählte Geräusche aus drei Kenney-CC0-Paketen
- `music/`: zwei CC0-Musikstücke von OpenGameArt
- `licenses/`: mitgelieferte Lizenz- und Quellennachweise

## Musikquellen

| Verwendung | Datei | Original | Urheber |
| --- | --- | --- | --- |
| Aufstieg | `climb-hopeful.ogg` | `levelmusicloop-tigrun.ogg` | qubodup |
| Bosskampf | `boss-urgent.mp3` | `urgent_0.mp3` | SRG774 |

## Effektquellen

Die Effekte stammen aus den Kenney-Paketen `Sci-fi Sounds`, `Digital Audio`
und `UI Audio`. Die konkreten Originaldateien und ihre Spielzuordnung sind in
`licenses/Kenney-CC0.txt` festgehalten.

## Technische Wiedergabe

Der `AudioManager` erstellt beim Start feste Stimmenpools. Dadurch kann kein
Gameplay-Ereignis unbegrenzt neue Audioobjekte erzeugen. Wiedergabe beginnt
erst nach einer Pointer- oder Tastaturinteraktion und hält sich damit an die
Autoplay-Regeln moderner Browser.
