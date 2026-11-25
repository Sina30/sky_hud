fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'sky_hud'
description 'GTA VI inspiriertes HUD-System (ESX / QBCore / QBox / Standalone)'
version '1.0.0'

shared_script 'config.lua'

client_scripts {
    'client/utils.lua',
    'client/bridge.lua',
    'client/settings.lua',
    'client/minimap.lua',
    'client/vehicle.lua',
    'client/navigation.lua',
    'client/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
    'html/locales/*.json',
}
