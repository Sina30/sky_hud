# sky_hud – GTA VI inspiriertes HUD

Modernes FiveM-HUD für **ESX, QBCore, QBox und Standalone**. Keine SQL-Datenbank nötig, die Einstellungen werden pro Spieler per KVP gespeichert.

## Funktionen

| Bereich | Inhalt |
|---|---|
| Status | Gesundheit (segmentiert), Rüstung, Ausdauer, Sauerstoff, Hunger, Durst, Stress, Fahndungssterne. Dynamisch ausblendbar |
| Kompass | Gradanzeige, Himmelsrichtungen, Straße/Kreuzung/Zone, Wegpunkt-Peilung mit Distanz, nächste Blips (Polizei, Krankenhaus, Tankstelle …) |
| GPS | Abbiegehinweise mit Symbol (inkl. „scharf links/rechts“, „wenden“, „neu berechnen“), Distanz zur Kreuzung, Restdistanz |
| Minimap | Native GTA-Minimap mit NUI-Rahmen, Lebens-/Rüstungsbalken ausgeblendet, zu Fuß optional |
| Verfolgungsmodus | Rot/blau pulsierender Minimap-Rahmen bei Fahndung oder Blaulicht im Einsatzfahrzeug |
| Tacho (Auto) | Drehzahlnadel, roter Bereich, Begrenzer-Blinken, Gang, Motorzustand, Licht/Fernlicht, Schloss, Tankanzeige. 4 Designs: `neon`, `sport`, `classic`, `carbon` |
| Flugzeug/Heli | Geschwindigkeits- und Höhenband, künstlicher Horizont (Nick/Roll), Kurs, Fahrwerk |
| Boot | Tacho, Leistungsbalken, Vorwärts/Rückwärts, Anker |
| Waffe | Symbol je Waffengruppe, Name, Magazin / Reserve |
| Sprache | **YaCA (yaca-voice)**, pma-voice oder SaltyChat, automatisch erkannt: Reichweitenstufe, Sprechen, Funk senden/empfangen, Frequenz. Bei YaCA zusätzlich Mikrofon stumm und Warnung „Nicht im Sprachkanal“ |
| Geld | Animierte Bargeld-/Bank-Benachrichtigungen (+/−) |
| Kinomodus | `/cinematic`: schwarze Balken, HUD aus |
| Einstellungen | `/hud` oder **F7**: Sichtbarkeit, Layout (Drag & Drop + Mausrad-Größe), Verhalten, KM/H ↔ MPH, Tacho-Design |

## Installation

1. Den Ordner `sky_hud` nach `resources/[hud]/` kopieren.
2. In der `server.cfg` **nach** dem Framework eintragen:
   ```
   ensure sky_hud
   ```
3. Andere HUDs deaktivieren (z. B. `qb-hud`, `esx_hud`), sonst überlagern sie sich.
4. `config.lua` anpassen (Framework, Sprache, Tanksystem, Sprach-Ressource).
5. Mit YaCA: `start yaca-voice` vor `ensure sky_hud` eintragen (`Config.Voice = 'auto'` erkennt es dann).

## Konfiguration (Auszug)

- `Config.Framework`: `'auto'` erkennt `qbx_core` → `qb-core` → `es_extended` → Standalone
- `Config.Locale`: `'de'` / `'en'`. Die Texte liegen in `html/locales/*.json` und gelten für Lua **und** NUI.
- `Config.Voice`: `'auto'`, `'yaca'`, `'pma-voice'`, `'saltychat'`, `'none'`
- `Config.FuelSystem`: `native`, `statebag` (ox_fuel), `legacyfuel`, `cdn-fuel`, `ps-fuel`
- `Config.DialByClass` / `Config.DialByModel`: Standard-Tacho pro Fahrzeugklasse bzw. Modell
- `Config.RpmScale`: Drehzahl-Skala pro Klasse (z. B. Motorräder 12k)
- `Config.CompassBlips`: welche Blip-Sprites der Kompass anzeigt
- `Config.GpsDirections`: Zuordnung der GTA-Richtungscodes zu Text/Symbol

## Exporte (Client)

```lua
exports.sky_hud:ToggleHud(false)                 -- HUD aus (nil = umschalten)
exports.sky_hud:IsHudVisible()
exports.sky_hud:SetCinematic(true)
exports.sky_hud:OpenSettings()
exports.sky_hud:SetComponentVisible('compass', false)
exports.sky_hud:SetStatus('stress', 40)          -- eigene Status-Systeme
exports.sky_hud:ShowMoneyChange('bank', 1500, true)
```

## Framework-Anbindung

| Framework | Hunger/Durst/Stress | Geld |
|---|---|---|
| QBCore / QBox | `PlayerData.metadata`, `hud:client:UpdateNeeds`, `hud:client:UpdateStress` | `QBCore:Client:OnMoneyChange` |
| ESX | `esx_status:onTick` | `esx:setAccountMoney` (Differenz wird berechnet) |
| Standalone | `exports.sky_hud:SetStatus(...)` | `exports.sky_hud:ShowMoneyChange(...)` |

## NUI im Browser testen

Den Ordner `html` über einen lokalen Webserver öffnen (z. B. `python -m http.server` in `html/`), dann:

- `index.html`: Auto-Tacho
- `index.html?veh=plane` / `?veh=boat`
- `index.html?style=sport` (oder `classic`, `carbon`)
- `index.html?chase&wanted&lowfuel`
- `index.html?settings`: Einstellungsmenü
- `index.html?lang=en`

Außerhalb von FiveM startet automatisch ein Demo-Modus mit Testdaten.

## Hinweise

- Läuft **sky_pausemenu**, nutzt das HUD automatisch dessen 3D-Minimap (`Config.MinimapSource = 'auto'`). Rahmen, GPS-Karte und Sprachanzeige richten sich dann nach `Config.Minimap` aus sky_pausemenu (Export `GetMinimapState`). Ein-/Ausblenden zu Fuß regelt dort `onlyInVehicle`.
- Ohne sky_pausemenu wird die **native** GTA-Minimap genutzt. Der Rahmen wird über Safezone und Seitenverhältnis berechnet und passt sich jeder Auflösung an.
- Die GPS-Richtungscodes von `GenerateDirectionsToCoord` sind nicht offiziell dokumentiert. Falls ein Hinweis nicht passt, die Zuordnung in `Config.GpsDirections` anpassen.
- Schriftarten (Bebas Neue, Inter) werden über Google Fonts geladen. Ohne Internet greifen die Ersatzschriften.
