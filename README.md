# Rentensteuer 2025

Web-App, die die Einkommensteuer 2025 für Rentnerinnen und Rentner in Deutschland Schritt für Schritt berechnet.
Sie lässt sich auf dem Handy und am Computer „installieren“ (PWA) und funktioniert danach auch offline.

**Alle Eingaben bleiben auf dem Gerät** (im Browser-Speicher). Es gibt keinen Server und kein Konto.

## Was die App rechnet

- Gesetzliche Rente und Witwen-/Witwerrente (Besteuerungsanteil, Folgerente), Betriebsrente, Werkspension
- Kranken- und Pflegeversicherung, weitere Versicherungen
- Zinsen und Kapitalerträge mit Günstigerprüfung
- Haushaltsnahe Dienstleistungen und Handwerker (§35a), Krankheitskosten, Behinderung und Pflege, Spenden, Kirchensteuer
- Altersentlastungsbetrag, Splitting, Soli, Kirchensteuer, Erstattung oder Nachzahlung

Die Berechnung ist eine Schätzung und ersetzt keine Steuerberatung.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/steuer2025.js` | Rechenkern (reine Funktionen, auch mit Node nutzbar) |
| `src/index.template.html` | Oberfläche; `/*CORE*/` wird beim Bauen durch den Rechenkern ersetzt |
| `src/sw.template.js` | Service Worker für Offline-Betrieb |
| `src/fonts.css` | Einbindung der Schrift Manrope (liegt unter `docs/fonts/`, SIL OFL) |
| `build.sh`, `build_pwa.py` | Bauen: `sh build.sh` |
| `docs/` | Fertige Web-App, wird über GitHub Pages veröffentlicht |

## Bauen und veröffentlichen

```sh
sh build.sh
```

Danach die Änderungen in `docs/` committen. GitHub Pages ist auf *Deploy from a branch*, Branch `main`, Ordner `/docs` eingestellt.

Das Auslesen von Belegen per Foto funktioniert nur, wenn die App in claude.ai geöffnet ist. In der installierten Version werden Beträge eingetippt.
