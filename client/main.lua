-- Hauptschleifen: sammelt Daten und schickt sie (nur bei Änderung) an die NUI
local playerId = PlayerId()
local cache = { ped = 0, vehicle = 0, inVehicle = false, chase = false }

-- ===================== Waffen =====================
local weaponGroups = {}
for group, kind in pairs({
    GROUP_MELEE = 'melee', GROUP_PISTOL = 'pistol', GROUP_SMG = 'smg', GROUP_RIFLE = 'rifle',
    GROUP_MG = 'mg', GROUP_SHOTGUN = 'shotgun', GROUP_SNIPER = 'sniper', GROUP_HEAVY = 'heavy',
    GROUP_THROWN = 'thrown', GROUP_STUNGUN = 'pistol', GROUP_PETROLCAN = 'utility',
    GROUP_FIREEXTINGUISHER = 'utility',
}) do
    weaponGroups[GetHashKey(group)] = kind
end

-- Lesbare Namen für gängige Waffen (Rest: Name aus dem Hash-Text)
local weaponNames = {}
for _, name in ipairs({
    'WEAPON_PISTOL', 'WEAPON_COMBATPISTOL', 'WEAPON_APPISTOL', 'WEAPON_PISTOL50', 'WEAPON_HEAVYPISTOL',
    'WEAPON_REVOLVER', 'WEAPON_STUNGUN', 'WEAPON_MICROSMG', 'WEAPON_SMG', 'WEAPON_ASSAULTSMG',
    'WEAPON_COMBATPDW', 'WEAPON_ASSAULTRIFLE', 'WEAPON_CARBINERIFLE', 'WEAPON_ADVANCEDRIFLE',
    'WEAPON_SPECIALCARBINE', 'WEAPON_BULLPUPRIFLE', 'WEAPON_COMPACTRIFLE', 'WEAPON_MG',
    'WEAPON_COMBATMG', 'WEAPON_PUMPSHOTGUN', 'WEAPON_SAWNOFFSHOTGUN', 'WEAPON_ASSAULTSHOTGUN',
    'WEAPON_SNIPERRIFLE', 'WEAPON_HEAVYSNIPER', 'WEAPON_RPG', 'WEAPON_GRENADE', 'WEAPON_MOLOTOV',
    'WEAPON_KNIFE', 'WEAPON_BAT', 'WEAPON_NIGHTSTICK', 'WEAPON_FLASHLIGHT', 'WEAPON_PETROLCAN',
    'WEAPON_FIREEXTINGUISHER',
}) do
    local pretty = name:gsub('WEAPON_', ''):lower():gsub('^%l', string.upper)
    weaponNames[GetHashKey(name)] = pretty
end

local UNARMED = GetHashKey('WEAPON_UNARMED')

local function collectWeapon(ped)
    local weapon = GetSelectedPedWeapon(ped)
    if weapon == UNARMED or weapon == 0 then return nil end

    local kind = weaponGroups[GetWeapontypeGroup(weapon)] or 'pistol'
    local data = { kind = kind, name = weaponNames[weapon] or kind:upper() }

    if kind ~= 'melee' then
        local _, clip = GetAmmoInClip(ped, weapon)
        local total = GetAmmoInPedWeapon(ped, weapon)
        data.clip = clip or 0
        data.reserve = math.max(0, total - (clip or 0))
    end
    return data
end

-- ===================== Sprache =====================
local voice = { talking = false, mode = 2, modes = 3, radio = false, channel = '', muted = false, offline = false }

-- 'auto' erkennt die laufende Sprach-Resource
local voiceSystem = Config.Voice
if voiceSystem == 'auto' then
    voiceSystem = 'none'
    for _, c in ipairs({ { 'yaca-voice', 'yaca' }, { 'pma-voice', 'pma-voice' }, { 'saltychat', 'saltychat' } }) do
        local st = GetResourceState(c[1])
        if st == 'started' or st == 'starting' then voiceSystem = c[2] break end
    end
end
Hud.voiceSystem = voiceSystem

if voiceSystem == 'pma-voice' then
    AddEventHandler('pma-voice:setTalkingMode', function(mode) voice.mode = mode end)
    RegisterNetEvent('pma-voice:radioActive', function(active) voice.radio = active end)

elseif voiceSystem == 'saltychat' then
    AddEventHandler('SaltyChat_VoiceRangeChanged', function(_, index, count)
        voice.mode = (index or 0) + 1
        voice.modes = count or 3
    end)
    AddEventHandler('SaltyChat_TalkStateChanged', function(isTalking) voice.talking = isTalking end)
    AddEventHandler('SaltyChat_RadioTrafficStateChanged', function(primaryReceive, primaryTransmit)
        voice.radio = primaryReceive or primaryTransmit
    end)

elseif voiceSystem == 'yaca' then
    local YACA = 'yaca-voice'
    local ranges = {}               -- alle Reichweiten aus YaCA, z. B. { 1, 3, 8, 15, 20, 25, 30, 40 }
    local activeChannel = 1
    local frequencies = {}          -- [Kanal] = Frequenz als String
    local radioTalking, radioReceiving = false, false

    -- Exporte von YaCA abgesichert aufrufen (Resource kann neu starten)
    local function yaca(fn, ...)
        local args = { ... }
        local ok, result = pcall(function() return exports[YACA][fn](exports[YACA], table.unpack(args)) end)
        if ok then return result end
    end

    -- Reichweite (Meter) in Stufe 1..n umrechnen
    local function applyRange(range)
        if #ranges == 0 then return end
        voice.modes = #ranges
        for i, r in ipairs(ranges) do
            if r >= range then voice.mode = i return end
        end
        voice.mode = #ranges
    end

    local function refreshChannel()
        local freq = frequencies[activeChannel]
        voice.channel = (freq and freq ~= '0') and freq or ''
    end

    local function syncFromExports()
        ranges = yaca('getVoiceRanges') or ranges
        local range = yaca('getVoiceRange')
        if range then applyRange(range) end
        activeChannel = yaca('getActiveRadioChannel') or activeChannel
        frequencies[activeChannel] = yaca('getRadioFrequency', activeChannel)
        refreshChannel()
        voice.muted = yaca('getMicrophoneMuteState') == true or yaca('getMicrophoneDisabledState') == true
        local state = yaca('getPluginState')
        voice.offline = state ~= nil and state ~= 'IN_INGAME_CHANNEL'
    end

    AddEventHandler('yaca:external:pluginInitialized', syncFromExports)
    AddEventHandler('yaca:external:pluginStateChanged', function(state)
        voice.offline = state ~= 'IN_INGAME_CHANNEL'
    end)
    AddEventHandler('yaca:external:voiceRangeUpdate', function(range) applyRange(range) end)
    AddEventHandler('yaca:external:isTalking', function(state) voice.talking = state end)
    AddEventHandler('yaca:external:microphoneMuteStateChanged', function(state) voice.muted = state end)
    AddEventHandler('yaca:external:microphoneDisabledStateChanged', function(state) voice.muted = state end)
    AddEventHandler('yaca:external:isRadioTalking', function(state)
        radioTalking = state
        voice.radio = radioTalking or radioReceiving
    end)
    AddEventHandler('yaca:external:isRadioReceiving', function(state)
        radioReceiving = state
        voice.radio = radioTalking or radioReceiving
    end)
    AddEventHandler('yaca:external:setRadioFrequency', function(channel, frequency)
        frequencies[channel] = frequency
        refreshChannel()
    end)
    AddEventHandler('yaca:external:changedActiveRadioChannel', function(channel)
        activeChannel = channel
        refreshChannel()
    end)

    -- Startwerte holen (auch wenn sky_hud nach YaCA neu gestartet wird)
    CreateThread(function()
        Wait(2000)
        syncFromExports()
    end)
end

local function collectVoice()
    -- pma-voice / Standalone: Sprechstatus über das native Voice-System
    if voiceSystem == 'pma-voice' or voiceSystem == 'none' then
        voice.talking = NetworkIsPlayerTalking(playerId)
    end
    if voiceSystem == 'pma-voice' then
        local prox = LocalPlayer.state.proximity
        if prox and prox.index then voice.mode = prox.index end
        local ch = LocalPlayer.state.radioChannel or 0
        voice.channel = ch ~= 0 and tostring(ch) or ''
    end
    return {
        talking = voice.talking,
        mode = voice.mode,
        modes = voice.modes,
        radio = voice.radio,
        channel = voice.channel,
        muted = voice.muted,
        offline = voice.offline,
    }
end

-- ===================== Sichtbarkeit =====================
local function hudAllowed()
    return Hud.visible
        and not IsPauseMenuActive()
        and not IsScreenFadedOut()
        and not IsPlayerSwitchInProgress()
end

-- Standard-HUD von GTA jeden Frame ausblenden
CreateThread(function()
    local components = Config.HideHudComponents
    while true do
        for i = 1, #components do
            HideHudComponentThisFrame(components[i])
        end
        Wait(0)
    end
end)

-- ===================== Status (250 ms) =====================
CreateThread(function()
    while true do
        local ped = PlayerPedId()
        cache.ped = ped
        local veh = GetVehiclePedIsIn(ped, false)
        cache.vehicle = veh
        cache.inVehicle = veh ~= 0

        local maxHealth = GetEntityMaxHealth(ped) - 100
        local health = maxHealth > 0 and (GetEntityHealth(ped) - 100) / maxHealth * 100 or 0

        local oxygen = 100
        if IsPedSwimmingUnderWater(ped) then
            oxygen = Clamp(GetPlayerUnderwaterTimeRemaining(playerId) * 10, 0, 100)
        end

        local wanted = GetPlayerWantedLevel(playerId)
        local siren = cache.inVehicle and GetVehicleClass(veh) == 18 and IsVehicleSirenOn(veh)
        cache.chase = Hud.settings.behaviour.chaseMode and (wanted > 0 or siren) or false

        SendHud('global', {
            show = hudAllowed(),
            cinematic = Hud.cinematic,
            inVehicle = cache.inVehicle,
        })

        SendHud('status', {
            health = Round(Clamp(health, 0, 100), 0),
            armor = GetPedArmour(ped),
            stamina = Round(100 - GetPlayerSprintStaminaRemaining(playerId), 0),
            oxygen = Round(oxygen, 0),
            hunger = Round(Hud.status.hunger, 0),
            thirst = Round(Hud.status.thirst, 0),
            stress = Round(Hud.status.stress, 0),
            wanted = wanted,
            thresholds = Config.DynamicThresholds,
        })

        SendHud('weapon', collectWeapon(ped) or { none = true })
        SendHud('voice', collectVoice())

        Wait(Config.Tick.status)
    end
end)

-- ===================== Fahrzeug (60 ms) =====================
CreateThread(function()
    while true do
        if cache.inVehicle and DoesEntityExist(cache.vehicle) then
            SendHud('vehicle', CollectVehicle(cache.ped, cache.vehicle))
            Wait(Config.Tick.vehicle)
        else
            SendHud('vehicle', { none = true })
            Wait(300)
        end
    end
end)

-- ===================== Kompass (100 ms) =====================
CreateThread(function()
    while true do
        local b = Hud.settings.behaviour
        if cache.inVehicle or b.compassOnFoot then
            SendHud('compass', CollectCompass(cache.ped, cache.inVehicle))
        else
            SendHud('compass', { none = true })
        end
        Wait(Config.Tick.compass)
    end
end)

-- ===================== Navigation + Minimap (500 ms) =====================
CreateThread(function()
    while true do
        UpdateMinimap(cache.inVehicle, cache.chase)
        SendHud('gps', CollectGps() or { none = true })
        Wait(Config.Tick.navigation)
    end
end)
