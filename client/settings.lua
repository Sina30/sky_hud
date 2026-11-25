-- Spielereinstellungen: lokal per KVP gespeichert, keine Datenbank nötig
local KVP_KEY = 'sky_hud:settings:v1'

local function defaults()
    return {
        components = {
            status = true, compass = true, weapon = true, vehicle = true,
            gps = true, minimap = true, voice = true, money = true, vehintro = true,
        },
        behaviour = {
            minimapOnFoot = false, hideMinimap = false,
            compassOnFoot = true, compassFollowCam = true,
            streetNames = true, headingDegrees = true, compassBlips = true,
            dynHealth = true, dynArmor = true, dynStamina = true, dynOxygen = true,
            dynHunger = true, dynThirst = true, dynStress = true,
            mph = Config.DefaultMph, smoothSpeedo = true,
            lowFuelAlert = true, chaseMode = true,
        },
        dialStyle = 'auto',
        layout = {},   -- { [elementId] = { x = %, y = %, scale = n } } – wird von der NUI verwaltet
    }
end

-- Gespeicherte Werte über die Standardwerte legen (neue Optionen bleiben so erhalten)
local function merge(base, saved)
    if type(saved) ~= 'table' then return base end
    for k, v in pairs(saved) do
        if type(v) == 'table' and type(base[k]) == 'table' then
            merge(base[k], v)
        elseif base[k] ~= nil and type(base[k]) == type(v) then
            base[k] = v
        end
    end
    return base
end

local function load()
    local raw = GetResourceKvpString(KVP_KEY)
    local ok, saved = pcall(json.decode, raw or '')
    Hud.settings = merge(defaults(), ok and saved or nil)
    -- Layout ist frei strukturiert und wird komplett übernommen
    if ok and type(saved) == 'table' and type(saved.layout) == 'table' then
        Hud.settings.layout = saved.layout
    end
end

local function save()
    SetResourceKvp(KVP_KEY, json.encode(Hud.settings))
end

local function sendInit()
    SendHudForce('init', {
        settings = Hud.settings,
        locale = Config.Locale,
        lowFuel = Config.LowFuelThreshold,
    })
end

local function setMenu(open)
    Hud.settingsOpen = open
    SetNuiFocus(open, open)
    SendHudForce('settings', { open = open })
end

-- ===================== NUI-Callbacks =====================
RegisterNUICallback('ready', function(_, cb)
    sendInit()
    cb('ok')
end)

RegisterNUICallback('saveSettings', function(data, cb)
    if type(data) == 'table' then
        Hud.settings = merge(defaults(), data)
        if type(data.layout) == 'table' then Hud.settings.layout = data.layout end
        save()
    end
    cb('ok')
end)

RegisterNUICallback('closeSettings', function(_, cb)
    setMenu(false)
    cb('ok')
end)

RegisterNUICallback('resetSettings', function(_, cb)
    Hud.settings = defaults()
    save()
    sendInit()
    cb('ok')
end)

-- ===================== Befehle & Tasten =====================
RegisterCommand(Config.SettingsCommand, function()
    setMenu(not Hud.settingsOpen)
end, false)
RegisterKeyMapping(Config.SettingsCommand, 'HUD-Einstellungen öffnen', 'keyboard', Config.SettingsKey)

RegisterCommand(Config.CinematicCommand, function()
    Hud.cinematic = not Hud.cinematic
end, false)

-- ===================== Exporte =====================
exports('OpenSettings', function() setMenu(true) end)
exports('IsHudVisible', function() return Hud.visible end)
exports('ToggleHud', function(state)
    if state == nil then state = not Hud.visible end
    Hud.visible = state == true
end)
exports('SetCinematic', function(state) Hud.cinematic = state == true end)
exports('SetComponentVisible', function(name, state)
    if Hud.settings.components[name] == nil then return false end
    Hud.settings.components[name] = state == true
    save()
    sendInit()
    return true
end)

load()

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and Hud.settingsOpen then
        SetNuiFocus(false, false)
    end
end)
