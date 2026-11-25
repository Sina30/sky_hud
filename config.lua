Config = {}

-- 'auto' | 'esx' | 'qb' | 'qbox' | 'standalone'
Config.Framework = 'auto'

-- Sprache der Oberfläche: 'de' | 'en'
Config.Locale = 'de'

-- Standard-Maßeinheit (Spieler können im Menü umschalten)
Config.DefaultMph = false

-- Befehl + Standardtaste für das Einstellungsmenü
Config.SettingsCommand = 'hud'
Config.SettingsKey = 'F7'
Config.CinematicCommand = 'cinematic'

-- Aktualisierungsraten in ms
Config.Tick = {
    status = 250,
    vehicle = 60,     -- Tachonadel braucht eine hohe Rate
    compass = 100,
    navigation = 500,
}

-- Minimap: 'auto' | 'native' (GTA-Radar) | 'sky_pausemenu' (3D-Minimap aus sky_pausemenu)
-- 'auto' nutzt sky_pausemenu, wenn die Resource läuft
Config.MinimapSource = 'auto'

-- Kraftstoff-Quelle: 'native' | 'statebag' (ox_fuel) | 'legacyfuel' | 'cdn-fuel' | 'ps-fuel'
Config.FuelSystem = 'native'
Config.LowFuelThreshold = 15

-- Sprach-Ressource: 'auto' | 'yaca' (yaca-voice) | 'pma-voice' | 'saltychat' | 'none'
-- 'auto' erkennt yaca-voice, pma-voice oder saltychat selbstständig
Config.Voice = 'auto'

-- Dynamische Sichtbarkeit: Anzeige wird ausgeblendet, wenn Wert >= Schwelle
Config.DynamicThresholds = {
    health = 100,
    armor = 100,      -- 0 Rüstung wird ebenfalls ausgeblendet
    stamina = 100,
    oxygen = 100,
    hunger = 90,
    thirst = 90,
    stress = 0,       -- Stress wird angezeigt, sobald er > 0 ist
}

-- Tacho-Design pro Fahrzeugklasse (GetVehicleClass). Spieler können das Design überschreiben.
-- Verfügbare Designs: 'neon' | 'sport' | 'classic' | 'carbon'
Config.DialByClass = {
    [0] = 'classic', [1] = 'classic', [2] = 'neon', [3] = 'classic',
    [4] = 'carbon',  [5] = 'sport',   [6] = 'sport', [7] = 'sport',
    [8] = 'carbon',  [9] = 'neon',    [10] = 'classic', [11] = 'classic',
    [12] = 'classic', [17] = 'classic', [18] = 'neon', [19] = 'carbon', [20] = 'classic',
}

-- Einzelne Modelle mit eigenem Design (Modellname -> Design)
Config.DialByModel = {
    feroci = 'sport',
    police = 'neon',
}

-- Drehzahl: maximale Anzeige (x1000) pro Klasse, Standard 8
Config.RpmScale = {
    default = 8,
    [8] = 12,   -- Motorräder
    [20] = 4,   -- LKW
}

-- Kompass: Blips, die automatisch auf dem Kompass erscheinen (Sprite -> Farbe in Hex)
Config.CompassBlips = {
    maxDistance = 1500.0,
    sprites = {
        [60] = '#4da6ff',   -- Polizei
        [61] = '#ff5c7a',   -- Krankenhaus
        [361] = '#ffb347',  -- Tankstelle
        [52] = '#9be15d',   -- Laden
        [72] = '#c792ea',   -- Werkstatt
        [357] = '#5ee7df',  -- Garage
    },
}

-- GPS: Rückgabewert von GenerateDirectionsToCoord -> Locale-Schlüssel + Symbol
-- (Codes laut FiveM-Native-Doku, teils als "unsicher" markiert – bei Bedarf hier anpassen)
Config.GpsDirections = {
    [0] = { key = 'gps_arrived',      icon = 'flag' },
    [1] = { key = 'gps_recalculating', icon = 'recalc' },
    [2] = { key = 'gps_follow',       icon = 'straight' },
    [3] = { key = 'gps_keep_left',    icon = 'keep_left' },
    [4] = { key = 'gps_turn_left',    icon = 'left' },
    [5] = { key = 'gps_turn_right',   icon = 'right' },
    [6] = { key = 'gps_keep_right',   icon = 'keep_right' },
    [7] = { key = 'gps_straight',     icon = 'straight' },
    [8] = { key = 'gps_keep_left',    icon = 'keep_left' },
}
-- Unter dieser Entfernung (m) wird ein Abbiegen als "scharf" angezeigt
Config.SharpTurnDistance = 15.0

-- GTA-Standard-HUD-Komponenten, die jeden Frame ausgeblendet werden
Config.HideHudComponents = { 2, 3, 4, 6, 7, 8, 9, 13, 20 }
