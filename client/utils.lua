-- Gemeinsamer Zustand aller Client-Module
Hud = {
    visible = true,       -- per Export / Pause-Menü steuerbar
    cinematic = false,
    settingsOpen = false,
    settings = {},        -- wird in settings.lua aus KVP geladen
    status = {},          -- Werte aus dem Framework (hunger, thirst, stress)
}

local lastSent = {}

-- Sprachdateien liegen als JSON in html/locales/ und werden von Lua und NUI gemeinsam genutzt
local function loadLocale(code)
    local raw = LoadResourceFile(GetCurrentResourceName(), ('html/locales/%s.json'):format(code))
    local ok, data = pcall(json.decode, raw or '')
    return ok and type(data) == 'table' and data or {}
end

local locale = loadLocale(Config.Locale)
local fallback = Config.Locale == 'en' and locale or loadLocale('en')

-- Übersetzung holen (Fallback: Englisch, dann Schlüssel selbst)
function L(key)
    return locale[key] or fallback[key] or key
end

-- Flacher Vergleich zweier Tabellen (Werte sind nur Zahlen/Strings/Booleans)
local function shallowEqual(a, b)
    if type(a) ~= 'table' or type(b) ~= 'table' then return a == b end
    for k, v in pairs(a) do
        if type(v) == 'table' then
            if not shallowEqual(v, b[k]) then return false end
        elseif b[k] ~= v then
            return false
        end
    end
    for k in pairs(b) do
        if a[k] == nil then return false end
    end
    return true
end

-- Schickt nur dann eine Nachricht an die NUI, wenn sich die Daten geändert haben
function SendHud(action, data)
    if shallowEqual(lastSent[action], data) then return end
    lastSent[action] = data
    SendNUIMessage({ action = action, data = data })
end

-- Immer senden (z. B. für Ereignisse wie Geldänderungen)
function SendHudForce(action, data)
    lastSent[action] = nil
    SendNUIMessage({ action = action, data = data })
end

function Round(value, decimals)
    local m = 10 ^ (decimals or 0)
    return math.floor(value * m + 0.5) / m
end

function Clamp(v, min, max)
    if v < min then return min end
    if v > max then return max end
    return v
end
