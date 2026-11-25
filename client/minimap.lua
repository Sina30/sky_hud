-- Native Minimap: Position für den NUI-Rahmen berechnen und Sichtbarkeit steuern

-- Berechnet die Bildschirmposition der Standard-Minimap (Anteile 0..1)
-- unter Berücksichtigung von Safezone und Seitenverhältnis.
function GetMinimapAnchor()
    local safezone = GetSafeZoneSize()
    local aspect = GetAspectRatio(false)
    local resX, resY = GetActiveScreenResolution()
    local xScale, yScale = 1.0 / resX, 1.0 / resY
    local szOffset = math.abs(safezone - 1.0) * 10

    -- Ultrawide: GTA hält die Minimap im 16:9-Bereich
    if aspect > 1.78 then
        aspect = 1.778
    end

    local anchor = {}
    anchor.width = xScale * (resX / (4 * aspect))
    anchor.height = yScale * (resY / 5.674)
    anchor.left = xScale * (resX * (1.0 / 20.0 * szOffset))
    anchor.bottom = 1.0 - yScale * (resY * (1.0 / 20.0 * szOffset))
    anchor.top = anchor.bottom - anchor.height
    return anchor
end

-- Lebens-/Rüstungsbalken unter der Minimap ausblenden (übernimmt unser Status-HUD)
CreateThread(function()
    local scaleform = RequestScaleformMovie('minimap')
    while not HasScaleformMovieLoaded(scaleform) do Wait(0) end

    SetRadarBigmapEnabled(false, false)
    while true do
        BeginScaleformMovieMethod(scaleform, 'SETUP_HEALTH_ARMOUR')
        ScaleformMovieMethodAddParamInt(3)
        EndScaleformMovieMethod()
        Wait(1000)
    end
end)

-- Welche Minimap wird benutzt? 'native' = GTA-Radar, 'sky_pausemenu' = 3D-Minimap aus sky_pausemenu
local function minimapSource()
    local src = Config.MinimapSource
    if src ~= 'auto' then return src end
    return GetResourceState('sky_pausemenu') == 'started' and 'sky_pausemenu' or 'native'
end

-- Prüft, ob die Minimap gerade sichtbar sein soll
function ShouldShowMinimap(inVehicle)
    local b = Hud.settings.behaviour
    if not Hud.visible or Hud.cinematic or IsPauseMenuActive() then return false end
    if b.hideMinimap then return false end
    if not inVehicle and not b.minimapOnFoot then return false end
    return true
end

local lastRadar, lastPmHidden = nil, nil

-- 3D-Minimap aus sky_pausemenu: Position und Sichtbarkeit von dort übernehmen
local function updatePausemenuMinimap(chase)
    -- Nur HUD aus / Kinomodus / "Minimap ausblenden" blenden die 3D-Minimap aus,
    -- ansonsten entscheidet sky_pausemenu selbst (z. B. onlyInVehicle)
    local hide = not Hud.visible or Hud.cinematic or Hud.settings.behaviour.hideMinimap
    if hide ~= lastPmHidden then
        pcall(function() exports.sky_pausemenu:SetMinimapHidden(hide) end)
        lastPmHidden = hide
    end

    local ok, st = pcall(function() return exports.sky_pausemenu:GetMinimapState() end)
    if not ok or type(st) ~= 'table' then return false end

    SendHud('minimap', {
        unit = 'vh',
        show = st.visible == true,
        left = st.left, bottom = st.bottom,
        width = st.width, height = st.height,
        chase = chase,
    })
    return true
end

function UpdateMinimap(inVehicle, chase)
    if minimapSource() == 'sky_pausemenu' and updatePausemenuMinimap(chase) then
        lastRadar = nil
        return
    end

    local show = ShouldShowMinimap(inVehicle)
    if show ~= lastRadar then
        DisplayRadar(show)
        lastRadar = show
    end

    local a = GetMinimapAnchor()
    SendHud('minimap', {
        unit = 'screen',
        show = show,
        left = Round(a.left, 4),
        top = Round(a.top, 4),
        width = Round(a.width, 4),
        height = Round(a.height, 4),
        chase = chase,
    })
end
