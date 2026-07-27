# Audio

Das Produktionsset wurde für `Little Bolt, Big Moon` vollständig
prozedural erstellt. Es enthält keine externen Aufnahmen, Samples oder
heruntergeladenen Soundbibliotheken.

## Klangrichtung

- weich, freundlich und leicht mechanisch
- keine aggressiven Rechteck- oder Sägezahnklänge
- kurze, deutlich begrenzte Gameplay-Rückmeldungen
- ruhige Aufstiegsmusik und etwas angespanntere Bossmusik

## Struktur

- `sfx/`: einmalige Geräusche für Byte, Waffen, Funde, Gegner und Zustände
- `music/`: wiederholbare Musik für Aufstieg und Bosskampf

Die Produktionsdateien sind mono kodierte PCM-WAV-Dateien. Effekte verwenden
44.100 Hz, die bewusst zurückhaltenden Musikschleifen 22.050 Hz.

## Technische Wiedergabe

Der `AudioManager` erstellt beim Start feste Stimmenpools. Dadurch kann kein
Gameplay-Ereignis unbegrenzt neue Audioobjekte erzeugen. Wiedergabe beginnt
erst nach einer Pointer- oder Tastaturinteraktion und hält sich damit an die
Autoplay-Regeln moderner Browser.
