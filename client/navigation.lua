-- Kompass, Straßennamen, Wegpunkt-Peilung und GPS-Abbiegehinweise
local WAYPOINT_SPRITE = 8

-- GTA-Heading (0 = Norden, gegen den Uhrzeigersinn) -> Kompassgrad (im Uhrzeigersinn)
local function toCompass(heading)
    return (360.0 - heading) % 360.0
end

local function bearingTo(from, to)
    local dx, dy = to.x - from.x, to.y - from.y
    local angle = math.deg(math.atan(dx, dy))  -- 0 = Norden, im Uhrzeigersinn
    return angle % 360.0
end

local function getWaypoint()
    local blip = GetFirstBlipInfoId(WAYPOINT_SPRITE)
    if not DoesBlipExist(blip) then return nil end
    return GetBlipInfoIdCoord(blip)
end

-- Unterstützte Blips im Umkreis für den Kompass sammeln
local function collectBlips(pos)
    local list = {}
    local max = Config.CompassBlips.maxDistance
    for sprite, color in pairs(Config.CompassBlips.sprites) do
        local blip = GetFirstBlipInfoId(sprite)
        local nearest, nearestDist = nil, max
        while DoesBlipExist(blip) do
            local c = GetBlipInfoIdCoord(blip)
            local d = #(vector2(c.x, c.y) - vector2(pos.x, pos.y))
            if d < nearestDist then nearest, nearestDist = c, d end
            blip = GetNextBlipInfoId(sprite)
        end
        -- Pro Typ nur der nächste Blip, damit der Kompass übersichtlich bleibt
        if nearest then
            list[#list + 1] = { b = Round(bearingTo(pos, nearest), 0), c = color }
        end
    end
    return list
end

local blipTimer, blipCache = 0, {}

function CollectCompass(ped, inVehicle)
    local b = Hud.settings.behaviour
    local pos = GetEntityCoords(ped)

    local heading
    if b.compassFollowCam then
        heading = GetGameplayCamRot(2).z
    else
        heading = GetEntityHeading(inVehicle and GetVehiclePedIsIn(ped, false) or ped)
    end

    local data = {
        heading = Round(toCompass(heading), 0),
        showDegrees = b.headingDegrees,
    }

    if b.streetNames then
        local s1, s2 = GetStreetNameAtCoord(pos.x, pos.y, pos.z)
        data.street = GetStreetNameFromHashKey(s1)
        data.cross = s2 ~= 0 and GetStreetNameFromHashKey(s2) or ''
        data.zone = GetLabelText(GetNameOfZone(pos.x, pos.y, pos.z))
    end

    local wp = getWaypoint()
    if wp then
        local dist = #(vector2(wp.x, wp.y) - vector2(pos.x, pos.y))
        data.waypoint = { b = Round(bearingTo(pos, wp), 0), d = FormatDistance(dist) }
    end

    if b.compassBlips then
        -- Blip-Suche ist teurer und läuft daher nur jede Sekunde
        local now = GetGameTimer()
        if now - blipTimer > 1000 then
            blipTimer = now
            blipCache = collectBlips(pos)
        end
        data.blips = blipCache
    end

    return data
end

function FormatDistance(meters)
    if Hud.settings.behaviour.mph then
        local miles = meters / 1609.344
        if miles < 0.1 then return string.format('%d ft', math.floor(meters * 3.28084)) end
        return string.format('%.1f mi', miles)
    end
    if meters < 1000 then return string.format('%d m', math.floor(meters)) end
    return string.format('%.1f km', meters / 1000)
end

-- GPS-Hinweis aus den Spiel-internen Routendaten erzeugen
function CollectGps()
    local wp = getWaypoint()
    if not wp or not IsWaypointActive() then return nil end

    local _, direction, _, distJunction = GenerateDirectionsToCoord(wp.x, wp.y, wp.z, true)
    direction = math.floor(direction or 0)
    local entry = Config.GpsDirections[direction] or Config.GpsDirections[2]

    local key, icon = entry.key, entry.icon
    -- Kurze Distanz zum Abbiegen => als "scharf" darstellen
    if (direction == 4 or direction == 5) and distJunction and distJunction > 0
        and distJunction < Config.SharpTurnDistance then
        key = direction == 4 and 'gps_sharp_left' or 'gps_sharp_right'
        icon = direction == 4 and 'sharp_left' or 'sharp_right'
    end

    local routeLen = GetGpsBlipRouteLength()
    return {
        text = L(key),
        icon = icon,
        junction = (distJunction and distJunction > 0) and FormatDistance(distJunction) or '',
        total = routeLen > 0 and FormatDistance(routeLen) or '',
    }
end
