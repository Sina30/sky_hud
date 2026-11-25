-- Sammelt alle Fahrzeugdaten für Tacho, Flugzeug- und Bootsinstrumente
local MPH, KMH = 2.236936, 3.6
local FEET = 3.28084

local labelCache = { vehicle = 0 }

-- Config.DialByModel nutzt Spawn-Namen -> einmalig in Hashes umrechnen
local dialByHash = {}
for name, style in pairs(Config.DialByModel) do
    dialByHash[GetHashKey(name)] = style
end

local function label(text)
    if not text or text == '' then return '' end
    local l = GetLabelText(text)
    if l == 'NULL' then return text end
    return l
end

local function getLabels(veh)
    if labelCache.vehicle == veh then return labelCache end
    local model = GetEntityModel(veh)
    local displayName = GetDisplayNameFromVehicleModel(model)
    labelCache = {
        vehicle = veh,
        make = label(GetMakeNameFromVehicleModel(model)),
        model = label(displayName),
        modelHash = model,
        class = GetVehicleClass(veh),
    }
    return labelCache
end

local function vehicleKind(class)
    if class == 14 then return 'boat' end
    if class == 15 then return 'heli' end
    if class == 16 then return 'plane' end
    return 'car'
end

-- Design des Tachos ermitteln: Spielerwahl > Modell > Klasse > Standard
local function dialStyle(labels)
    local chosen = Hud.settings.dialStyle
    if chosen and chosen ~= 'auto' then return chosen end
    return dialByHash[labels.modelHash] or Config.DialByClass[labels.class] or 'neon'
end

function CollectVehicle(ped, veh)
    local labels = getLabels(veh)
    local kind = vehicleKind(labels.class)
    local mph = Hud.settings.behaviour.mph
    local speed = GetEntitySpeed(veh) * (mph and MPH or KMH)
    local fuel = GetFuel(veh) or 0
    local engine = GetVehicleEngineHealth(veh) / 10.0
    local _, lightsOn, highBeams = GetVehicleLightsState(veh)

    local data = {
        kind = kind,
        unit = mph and 'mph' or 'km/h',
        speed = math.floor(speed + 0.5),
        fuel = Round(Clamp(fuel, 0, 100), 0),
        engine = Round(Clamp(engine, 0, 100), 0),
        engineOn = GetIsVehicleEngineRunning(veh),
        lights = highBeams == 1 and 2 or (lightsOn == 1 and 1 or 0),
        locked = GetVehicleDoorLockStatus(veh) >= 2,
        make = labels.make,
        model = labels.model,
        style = dialStyle(labels),
        isDriver = GetPedInVehicleSeat(veh, -1) == ped,
    }

    if kind == 'car' then
        local gear = GetVehicleCurrentGear(veh)
        local rpm = GetVehicleCurrentRpm(veh)
        if not data.engineOn then rpm = 0.0 end
        local reversing = GetEntitySpeedVector(veh, true).y < -0.5

        data.rpm = Round(rpm, 3)
        data.rpmMax = Config.RpmScale[labels.class] or Config.RpmScale.default
        data.gear = (reversing or gear == 0) and L('veh_gear_r')
            or (speed < 1 and rpm < 0.25) and L('veh_gear_n')
            or tostring(gear)
    elseif kind == 'plane' or kind == 'heli' then
        local coords = GetEntityCoords(veh)
        data.altitude = math.floor(coords.z * (mph and FEET or 1.0))
        data.altUnit = mph and 'ft' or 'm'
        data.pitch = Round(GetEntityPitch(veh), 1)
        data.roll = Round(GetEntityRoll(veh), 1)
        data.heading = Round(GetEntityHeading(veh), 0)
        data.vspeed = Round(GetEntityVelocity(veh).z * (mph and FEET or 1.0), 1)
        if kind == 'plane' then
            local gearState = GetLandingGearState(veh)
            data.gearDown = gearState == 0 or gearState == 2
        end
    elseif kind == 'boat' then
        local rpm = GetVehicleCurrentRpm(veh)
        data.power = Round((data.engineOn and rpm or 0) * 100, 0)
        data.reverse = GetEntitySpeedVector(veh, true).y < -0.5
        data.anchored = IsBoatAnchored(veh)
    end

    return data
end
