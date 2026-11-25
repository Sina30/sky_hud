-- Framework-Adapter: liefert Hunger/Durst/Stress und Geldänderungen
local framework = Config.Framework

local function detectFramework()
    if framework ~= 'auto' then return framework end
    -- 'starting' zählt mit, falls das Framework im selben Moment hochfährt
    for _, c in ipairs({ { 'qbx_core', 'qbox' }, { 'qb-core', 'qb' }, { 'es_extended', 'esx' } }) do
        local st = GetResourceState(c[1])
        if st == 'started' or st == 'starting' then return c[2] end
    end
    return 'standalone'
end
framework = detectFramework()
Hud.framework = framework

Hud.status.hunger = 100
Hud.status.thirst = 100
Hud.status.stress = 0

local function notifyMoney(account, amount, isMinus)
    if amount == 0 then return end
    SendHudForce('money', {
        account = account,
        amount = math.abs(amount),
        minus = isMinus,
        label = L(account == 'bank' and 'money_bank' or 'money_cash'),
    })
end

-- ===================== QBCore / QBox =====================
if framework == 'qb' or framework == 'qbox' then
    local function applyMetadata(data)
        if not data or not data.metadata then return end
        Hud.status.hunger = data.metadata.hunger or Hud.status.hunger
        Hud.status.thirst = data.metadata.thirst or Hud.status.thirst
        Hud.status.stress = data.metadata.stress or Hud.status.stress
    end

    local function loadPlayerData()
        if framework == 'qbox' then
            applyMetadata(exports.qbx_core:GetPlayerData())
        else
            local QBCore = exports['qb-core']:GetCoreObject()
            applyMetadata(QBCore.Functions.GetPlayerData())
        end
    end

    RegisterNetEvent('QBCore:Client:OnPlayerLoaded', loadPlayerData)
    RegisterNetEvent('QBCore:Player:SetPlayerData', applyMetadata)

    RegisterNetEvent('hud:client:UpdateNeeds', function(hunger, thirst)
        Hud.status.hunger = hunger or Hud.status.hunger
        Hud.status.thirst = thirst or Hud.status.thirst
    end)

    RegisterNetEvent('hud:client:UpdateStress', function(stress)
        Hud.status.stress = stress or Hud.status.stress
    end)

    RegisterNetEvent('QBCore:Client:OnMoneyChange', function(moneyType, amount, operation)
        if moneyType ~= 'cash' and moneyType ~= 'bank' then return end
        if operation == 'set' then return end
        notifyMoney(moneyType, amount, operation == 'remove')
    end)

    CreateThread(function()
        Wait(1000)
        loadPlayerData()
    end)

-- ===================== ESX =====================
elseif framework == 'esx' then
    local accounts = {}

    local function cacheAccounts(list)
        for _, acc in ipairs(list or {}) do
            accounts[acc.name] = acc.money
        end
    end

    RegisterNetEvent('esx:playerLoaded', function(xPlayer)
        cacheAccounts(xPlayer and xPlayer.accounts)
    end)

    RegisterNetEvent('esx:setAccountMoney', function(account)
        local old = accounts[account.name]
        accounts[account.name] = account.money
        if old == nil then return end

        local key = account.name == 'money' and 'cash' or account.name
        if key ~= 'cash' and key ~= 'bank' then return end
        local diff = account.money - old
        notifyMoney(key, diff, diff < 0)
    end)

    -- esx_status liefert alle Status-Werte gesammelt
    RegisterNetEvent('esx_status:onTick', function(data)
        for _, s in ipairs(data) do
            if s.name == 'hunger' then Hud.status.hunger = s.percent
            elseif s.name == 'thirst' then Hud.status.thirst = s.percent
            elseif s.name == 'stress' then Hud.status.stress = s.percent end
        end
    end)

    CreateThread(function()
        Wait(1000)
        local ok, ESX = pcall(function() return exports.es_extended:getSharedObject() end)
        if ok and ESX then
            local data = ESX.GetPlayerData()
            cacheAccounts(data and data.accounts)
        end
    end)
end

-- ===================== Für eigene Systeme =====================
-- exports.sky_hud:SetStatus('hunger', 55)
exports('SetStatus', function(name, value)
    if Hud.status[name] == nil then return false end
    Hud.status[name] = Clamp(tonumber(value) or 0, 0, 100)
    return true
end)

-- exports.sky_hud:ShowMoneyChange('cash', 500, false)
exports('ShowMoneyChange', function(account, amount, isMinus)
    notifyMoney(account == 'bank' and 'bank' or 'cash', tonumber(amount) or 0, isMinus == true)
end)

-- Kraftstoff je nach konfiguriertem System lesen
local fuelResources = { legacyfuel = 'LegacyFuel', ['cdn-fuel'] = 'cdn-fuel', ['ps-fuel'] = 'ps-fuel' }

function GetFuel(vehicle)
    local sys = Config.FuelSystem
    if sys == 'statebag' then
        return Entity(vehicle).state.fuel or GetVehicleFuelLevel(vehicle)
    end
    local res = fuelResources[sys]
    if res then
        -- pcall: fehlt die Resource, nutzen wir den nativen Wert statt abzustürzen
        local ok, value = pcall(function() return exports[res]:GetFuel(vehicle) end)
        if ok and value then return value end
    end
    return GetVehicleFuelLevel(vehicle)
end
