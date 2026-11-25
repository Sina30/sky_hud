'use strict';

/* =========================================================
   sky_hud – NUI
   Empfängt Daten aus Lua (SendNUIMessage) und rendert das HUD.
   Im normalen Browser startet automatisch ein Demo-Modus.
   ========================================================= */

const IS_FIVEM = typeof GetParentResourceName === 'function';
const RESOURCE = IS_FIVEM ? GetParentResourceName() : 'sky_hud';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const state = {
    settings: null,
    locale: {},
    lowFuel: 15,
    last: {},          // zuletzt empfangene Daten je Bereich
    editing: false,
    tab: 'visibility',
};

const t = (key) => state.locale[key] ?? key;

function post(name, data = {}) {
    if (!IS_FIVEM) return Promise.resolve();
    return fetch(`https://${RESOURCE}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    }).catch(() => {});
}

/* ===================== Symbole ===================== */
const ICONS = {
    health: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.2 3.3 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.7 0 5.9 3.7 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    armor: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/></svg>',
    stamina: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    oxygen: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="5"/><circle cx="17" cy="8" r="3.5"/><circle cx="18" cy="17" r="2"/></svg>',
    hunger: '<svg viewBox="0 0 24 24"><path d="M7 2v8a3 3 0 0 0 2 2.8V22h2V12.8A3 3 0 0 0 13 10V2h-1.5v7h-1V2h-1v7h-1V2H7zm10 0c-2 0-3 2.5-3 6v5h2v9h2V2h-1z"/></svg>',
    thirst: '<svg viewBox="0 0 24 24"><path d="M12 2s-7 7.6-7 12.5A7 7 0 0 0 19 14.5C19 9.6 12 2 12 2z"/></svg>',
    stress: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-4 7.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM7 17c1.2-2 3-3 5-3s3.8 1 5 3H7z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4L1.5 9.6 9 8.9z"/></svg>',
    headset: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z"/></svg>',
    engine: '<svg viewBox="0 0 24 24"><path d="M7 5h6v2h-2v2h4l2 2h2v-2h2v8h-2v-2h-2l-2 3H8l-2-3H4v3H2V9h2v3h2V9h3V7H7V5z"/></svg>',
    lights: '<svg viewBox="0 0 24 24"><path d="M13 5C8 5 6 8.5 6 12s2 7 7 7c3.5 0 5-3 5-7s-1.5-7-5-7zM1 7h4v2H1zm0 4h4v2H1zm0 4h4v2H1z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2h1v12H5V10h1zm2 0h8V8a4 4 0 0 0-8 0v2z"/></svg>',
    fuel: '<svg viewBox="0 0 24 24"><path d="M4 3h10v18H4V3zm2 2v5h6V5H6zm10 3l3 3v8a1 1 0 0 0 2 0v-9l-3-3 1-1 3 3v10a3 3 0 0 1-6 0v-6h-2V8h2z"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm-1 7h2v6h-2V9zm0 8h2v2h-2v-2z"/></svg>',
};

const GPS_ICONS = {
    straight: '<svg viewBox="0 0 24 24"><path d="M12 20V4M6 10l6-6 6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M16 20v-7a4 4 0 0 0-4-4H5M9 5L5 9l4 4"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M8 20v-7a4 4 0 0 1 4-4h7M15 5l4 4-4 4"/></svg>',
    sharp_left: '<svg viewBox="0 0 24 24"><path d="M15 20V6L6 15M6 9v6h6"/></svg>',
    sharp_right: '<svg viewBox="0 0 24 24"><path d="M9 20V6l9 9M18 9v6h-6"/></svg>',
    keep_left: '<svg viewBox="0 0 24 24"><path d="M14 20v-6L8 8V4M5 7l3-3 3 3"/></svg>',
    keep_right: '<svg viewBox="0 0 24 24"><path d="M10 20v-6l6-6V4M13 7l3-3 3 3"/></svg>',
    uturn: '<svg viewBox="0 0 24 24"><path d="M8 20V9a4 4 0 0 1 8 0v6M13 12l3 3 3-3"/></svg>',
    recalc: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
};

const WEAPON_ICONS = {
    pistol: '<svg viewBox="0 0 64 28"><path d="M8 6h40v8H30l-3 3h-5l-2 9h-9l3-12H8z"/></svg>',
    smg: '<svg viewBox="0 0 64 28"><path d="M4 6h46v3h8v4H40l-2 4h-4l-2 9h-6l2-9h-6l-2 5h-5l2-5H4z"/></svg>',
    rifle: '<svg viewBox="0 0 64 28"><path d="M2 8h6l2 3h30l2-4h20v4H48v4h-8l-2 4h-6l1 6h-6l-1-6H18l-4 5H6l4-7H2z"/></svg>',
    mg: '<svg viewBox="0 0 64 28"><path d="M2 8h8l2 3h32V7h18v4H46v5h-8l-2 4h-7l1 6h-6l-1-6H18l-4 5H6l4-7H2z"/></svg>',
    shotgun: '<svg viewBox="0 0 64 28"><path d="M2 10h10l4 2h46v4H30l-4 3H14l-4 6H3l5-8H2z"/></svg>',
    sniper: '<svg viewBox="0 0 64 28"><path d="M20 3h16v4H20zM2 9h8l2 3h50v3H44v3h-6l-2 3h-6l-1-3H18l-5 6H5l5-8H2z"/></svg>',
    heavy: '<svg viewBox="0 0 64 28"><path d="M2 8h50l10-4v18l-10-4H40l-2 8h-6l2-8H2z"/></svg>',
    thrown: '<svg viewBox="0 0 64 28"><circle cx="32" cy="16" r="9"/><path d="M29 3h6v5h-6z"/></svg>',
    melee: '<svg viewBox="0 0 64 28"><path d="M6 20L46 6l4 4-38 16z M50 4l8-2-2 8z"/></svg>',
    utility: '<svg viewBox="0 0 64 28"><path d="M22 4h20v22H22zM26 0h12v4H26z"/></svg>',
};

/* ===================== Init ===================== */
function initStatusIcons() {
    $$('#status .stat').forEach((el) => {
        el.querySelector('.ico').innerHTML = ICONS[el.dataset.stat];
    });
    $('#voice .voice-ico').innerHTML = ICONS.headset;
}

async function loadLocale(code) {
    try {
        const res = await fetch(`locales/${code}.json`);
        state.locale = await res.json();
    } catch {
        state.locale = {};
    }
}

async function onInit(data) {
    state.settings = data.settings;
    state.lowFuel = data.lowFuel ?? 15;
    await loadLocale(data.locale || 'de');
    applyLayout();
    applyComponentVisibility();
    buildCompass();
    vehicleRender.reset();
    if (!$('#settings').classList.contains('hidden')) renderSettings();
    $('#hud').classList.remove('hidden');
}

/* ===================== Globale Sichtbarkeit ===================== */
function onGlobal(d) {
    $('#hud').classList.toggle('faded', !d.show && !state.editing);
    $('#hud').classList.toggle('cinematic', !!d.cinematic);
}

function compOn(name) {
    return !state.settings || state.settings.components[name] !== false;
}

function applyComponentVisibility() {
    ['status', 'compass', 'weapon', 'vehicle', 'money'].forEach((c) => refreshEl(c));
    if (state.last.minimap) onMinimap(state.last.minimap);
    if (state.last.gps) onGps(state.last.gps);
    if (state.last.voice) onVoice(state.last.voice);
}

// Element ausblenden, wenn Komponente deaktiviert oder keine Daten vorhanden
function refreshEl(name) {
    const el = $('#' + name);
    if (!el) return;
    const data = state.last[name];
    const hasData = name === 'status' || name === 'money' || (data && !data.none);
    el.classList.toggle('off', !(compOn(name) && hasData) && !state.editing);
}

/* ===================== Status ===================== */
function onStatus(d) {
    const b = state.settings?.behaviour ?? {};
    const th = d.thresholds ?? {};
    const dyn = {
        health: b.dynHealth, armor: b.dynArmor, stamina: b.dynStamina, oxygen: b.dynOxygen,
        hunger: b.dynHunger, thirst: b.dynThirst, stress: b.dynStress,
    };

    $$('#status .stat').forEach((el) => {
        const key = el.dataset.stat;
        const v = clamp(Number(d[key]) || 0, 0, 100);
        el.querySelector('.bar span').style.transform = `scaleX(${v / 100})`;

        let hide = false;
        if (dyn[key] && !state.editing) {
            if (key === 'stress') hide = v <= (th.stress ?? 0);
            else if (key === 'armor') hide = v <= 0 || v >= (th.armor ?? 100);
            else hide = v >= (th[key] ?? 100);
        }
        el.classList.toggle('collapsed', hide);
        el.classList.toggle('low', key !== 'stress' && key !== 'armor' && v < 20);
    });

    const wanted = $('#wanted');
    const stars = d.wanted || 0;
    if (wanted.childElementCount !== stars) wanted.innerHTML = ICONS.star.repeat(stars);
    refreshEl('status');
}

/* ===================== Kompass ===================== */
const PX_PER_DEG = 3;
const DIRS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };

function buildCompass() {
    const track = $('#compass .compass-track');
    // Himmelsrichtungen kommen aus der Sprachdatei (z. B. "N,NO,O,SO,S,SW,W,NW")
    const local = (state.locale.compass_dirs || '').split(',');
    const names = {};
    Object.keys(DIRS).forEach((deg, i) => { names[deg] = local[i] || DIRS[deg]; });
    let html = '';
    // -180 … 540 Grad, damit beim Übergang 359 -> 0 nichts springt
    for (let deg = -180; deg <= 540; deg += 5) {
        const norm = ((deg % 360) + 360) % 360;
        const x = deg * PX_PER_DEG;
        if (DIRS[norm] !== undefined) {
            const card = norm % 90 === 0;
            html += `<span class="dir ${card ? 'card' : ''} ${norm === 0 ? 'n' : ''}" style="left:${x}px">${names[norm]}</span>`;
            html += `<i class="tick big" style="left:${x}px"></i>`;
        } else {
            html += `<i class="tick ${norm % 15 === 0 ? 'big' : ''}" style="left:${x}px"></i>`;
        }
    }
    track.innerHTML = html;
}

function relAngle(target, heading) {
    return ((target - heading + 540) % 360) - 180;
}

function onCompass(d) {
    refreshEl('compass');
    if (d.none) return;
    const el = $('#compass');
    $('.compass-track', el).style.transform = `translateX(${-d.heading * PX_PER_DEG}px)`;
    $('.compass-deg', el).textContent = d.showDegrees ? `${d.heading}°` : '';
    $('.compass-street', el).textContent = d.street ?? '';
    $('.compass-zone', el).textContent = d.zone ? (d.cross ? `${d.cross} · ${d.zone}` : d.zone) : '';

    const half = el.offsetWidth / 2;
    const limit = half / PX_PER_DEG - 8;
    let html = '';
    (d.blips ?? []).forEach((b) => {
        const rel = relAngle(b.b, d.heading);
        if (Math.abs(rel) < limit) html += `<div class="mk" style="left:${half + rel * PX_PER_DEG}px;--c:${b.c}"><i></i></div>`;
    });
    if (d.waypoint) {
        // Wegpunkt nur bis zum Rand des voll sichtbaren Bereichs klemmen (Maske blendet 18 % je Seite aus)
        const wpLimit = (half * 0.62) / PX_PER_DEG;
        const rel = clamp(relAngle(d.waypoint.b, d.heading), -wpLimit, wpLimit);
        html += `<div class="mk wp" style="left:${half + rel * PX_PER_DEG}px"><i></i><small>${d.waypoint.d}</small></div>`;
    }
    $('.compass-markers', el).innerHTML = html;
}

/* ===================== Waffe ===================== */
function onWeapon(d) {
    refreshEl('weapon');
    if (d.none) return;
    const el = $('#weapon');
    el.classList.toggle('melee', d.clip === undefined);
    el.classList.toggle('low', d.clip !== undefined && d.clip <= 3);
    $('.clip', el).textContent = d.clip ?? '';
    $('.reserve', el).textContent = d.reserve !== undefined ? `/ ${d.reserve}` : '';
    $('.weapon-name', el).textContent = d.name ?? '';
    const icon = $('.weapon-icon', el);
    if (icon.dataset.kind !== d.kind) {
        icon.dataset.kind = d.kind;
        icon.innerHTML = WEAPON_ICONS[d.kind] ?? WEAPON_ICONS.pistol;
    }
}

/* ===================== Geld ===================== */
function onMoney(d) {
    if (!compOn('money')) return;
    const item = document.createElement('div');
    item.className = 'money-item' + (d.minus ? ' minus' : '');
    const amount = Number(d.amount).toLocaleString('de-DE');
    item.innerHTML = `<small>${d.label}</small><b>${d.minus ? '−' : '+'} $${amount}</b>`;
    $('#money').prepend(item);
    setTimeout(() => item.remove(), 4100);
    while ($('#money').childElementCount > 4) $('#money').lastElementChild.remove();
}

/* ===================== Minimap / GPS / Sprache ===================== */
function onMinimap(d) {
    const el = $('#minimap-frame');
    if (d.unit === 'vh') {
        // 3D-Minimap aus sky_pausemenu: Werte kommen direkt in vh (unten verankert)
        Object.assign(el.style, {
            left: `${d.left}vh`, bottom: `${d.bottom}vh`, top: 'auto',
            width: `${d.width}vh`, height: `${d.height}vh`,
        });
    } else {
        Object.assign(el.style, {
            left: `${d.left * 100}vw`, top: `${d.top * 100}vh`, bottom: 'auto',
            width: `${d.width * 100}vw`, height: `${d.height * 100}vh`,
        });
    }
    el.classList.toggle('off', !d.show || !compOn('minimap'));
    el.classList.toggle('chase', !!d.chase && d.show);
    $('.chase-label', el).textContent = t('chase');
    // Ohne Minimap auch GPS und Sprache ausblenden – sie hängen am Rahmen
    el.style.opacity = d.show ? 1 : 0;
}

function onGps(d) {
    const el = $('#gps');
    const show = !d.none && compOn('gps');
    el.classList.toggle('off', !show);
    $('#gps-total').textContent = show ? d.total : '';
    if (!show) return;
    $('.gps-main', el).textContent = d.text;
    $('.gps-dist', el).textContent = d.junction;
    el.classList.toggle('recalc', d.icon === 'recalc');
    const icon = $('.gps-icon', el);
    if (icon.dataset.icon !== d.icon) {
        icon.dataset.icon = d.icon;
        icon.innerHTML = GPS_ICONS[d.icon] ?? GPS_ICONS.straight;
    }
}

function onVoice(d) {
    const el = $('#voice');
    el.classList.toggle('hidden', !compOn('voice'));
    el.classList.toggle('talking', !!d.talking);
    el.classList.toggle('radio', !!d.radio);
    el.classList.toggle('muted', !!d.muted);
    el.classList.toggle('offline', !!d.offline);
    const modes = d.modes || 3;
    let bars = '';
    for (let i = 1; i <= modes; i++) bars += `<i class="${i <= d.mode ? 'on' : ''}" style="height:${4 + i * 4}px"></i>`;
    $('.voice-range', el).innerHTML = bars;
    // Kein TeamSpeak-Ingame-Channel (YaCA) hat Vorrang vor der Funk-Anzeige
    $('.voice-radio', el).textContent = d.offline ? t('voice_offline') : (d.channel ? `${d.channel} MHz` : '');
}

/* ===================== Fahrzeug-Intro ===================== */
const vehicleIntro = (() => {
    let lastKey = null, timer = null;

    const level = (v, good, ok) => (v >= good ? '' : v >= ok ? 'warn' : 'bad');

    function show(d) {
        const el = $('#veh-intro');
        $('.vi-make', el).textContent = d.make ?? '';
        $('.vi-model', el).textContent = d.model ?? '';
        const icons = [
            [ICONS.lock, d.locked ? '' : 'warn'],
            [ICONS.engine, level(d.engine ?? 100, 70, 35)],
            [ICONS.fuel, level(d.fuel ?? 100, 40, state.lowFuel)],
        ];
        $('.vi-icons', el).innerHTML = icons.map(([svg, cls]) => `<i class="${cls}">${svg}</i>`).join('');
        el.classList.remove('off');
        clearTimeout(timer);
        timer = setTimeout(() => el.classList.add('off'), 5000);
    }

    // Wird bei jedem Fahrzeug-Update aufgerufen; zeigt die Karte nur beim Einsteigen / Fahrzeugwechsel
    function update(d, preview) {
        if (preview) return;
        if (!d || d.none) {
            lastKey = null;
            clearTimeout(timer);
            $('#veh-intro').classList.add('off');
            return;
        }
        const key = `${d.make}|${d.model}`;
        if (key === lastKey) return;
        lastKey = key;
        if (compOn('vehintro') && compOn('vehicle')) show(d);
    }

    return { update };
})();

/* ===================== Fahrzeug ===================== */
const vehicleRender = (() => {
    const CX = 135, CY = 135, R = 116;
    const START = 135, SWEEP = 270;
    let built = null;          // Schlüssel des aufgebauten Layouts
    let shownSpeed = 0, targetSpeed = 0, raf = null;

    const polar = (deg, r) => {
        const a = (deg * Math.PI) / 180;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };
    const arc = (from, to, r) => {
        const [x1, y1] = polar(from, r), [x2, y2] = polar(to, r);
        return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    };

    // Rundinstrument (Auto: Drehzahl, Boot: Geschwindigkeit)
    function dialSvg(max, majorStep, minorPerMajor, redFrom, labelFn) {
        let ticks = '', nums = '';
        const majors = max / majorStep;
        for (let i = 0; i <= majors * minorPerMajor; i++) {
            const v = i / (majors * minorPerMajor);
            const deg = START + SWEEP * v;
            const big = i % minorPerMajor === 0;
            // redFrom = 1 bedeutet "kein roter Bereich" (Boot) – sonst wäre der Endwert rot
            const red = redFrom < 1 && v >= redFrom;
            const [x1, y1] = polar(deg, R - 8);
            const [x2, y2] = polar(deg, R - (big ? 22 : 15));
            ticks += `<line class="dial-tick ${big ? 'big' : ''} ${red ? 'red' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            if (big) {
                const [nx, ny] = polar(deg, R - 38);
                nums += `<text class="dial-num ${red ? 'red' : ''}" x="${nx}" y="${ny}">${labelFn(i / minorPerMajor * majorStep)}</text>`;
            }
        }
        const redStart = START + SWEEP * redFrom;
        return `<svg viewBox="0 0 270 270">
            <circle class="dial-bg" cx="${CX}" cy="${CY}" r="${R + 10}"/>
            <path class="dial-ring" d="${arc(START, START + SWEEP, R + 2)}"/>
            ${redFrom < 1 ? `<path class="dial-red" d="${arc(redStart, START + SWEEP, R + 2)}"/>` : ''}
            <path class="dial-arc" d="${arc(START, START + SWEEP, R + 2)}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
            ${ticks}${nums}
            <circle class="dial-hub" cx="${CX}" cy="${CY}" r="58"/>
            <g class="dial-needle-g" style="transform-origin:${CX}px ${CY}px; transform: rotate(${START}deg)">
                <line class="dial-needle" x1="${CX + 60}" y1="${CY}" x2="${CX + R - 10}" y2="${CY}"/>
            </g>
            <text class="dial-unit" x="${CX}" y="${CY - 28}"></text>
            <text class="dial-speed" x="${CX}" y="${CY + 6}">0</text>
            <circle class="dial-gear-c" cx="${CX}" cy="${CY + 44}" r="13"/>
            <text class="dial-gear" x="${CX}" y="${CY + 44}">N</text>
        </svg>`;
    }

    function iconsHtml() {
        return `<div class="dial-icons">
            <i class="engine">${ICONS.engine}</i><i class="lights">${ICONS.lights}</i><i class="lock">${ICONS.lock}</i>
        </div>`;
    }

    function fuelSvg() {
        return `<svg viewBox="0 0 62 62">
            <circle class="f-bg" cx="31" cy="31" r="30"/>
            <path class="f-ring" d="M12 45 A22 22 0 1 1 50 45"/>
            <path class="f-arc" d="M12 45 A22 22 0 1 1 50 45" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/>
            <g transform="translate(23 21) scale(.7)" class="f-ico">${ICONS.fuel.replace(/<\/?svg[^>]*>/g, '')}</g>
            <text class="f-lbl" x="14" y="56">E</text><text class="f-lbl" x="48" y="56">F</text>
        </svg>`;
    }

    // Lineares Band für Flugzeug-Instrumente (Geschwindigkeit / Höhe)
    function tapeHtml(side, max, step, unit) {
        let spans = '';
        for (let v = 0; v <= max; v += step) spans += `<span style="top:${-(v / step) * 20}px">${v}</span>`;
        return `<div class="tape ${side}"><div class="tape-inner">${spans}</div><div class="tape-val">0</div><div class="tape-unit">${unit}</div></div>`;
    }

    function horizonHtml() {
        let lines = '';
        for (let p = -30; p <= 30; p += 10) {
            if (p === 0) continue;
            lines += `<i class="pl" style="top:calc(50% + ${-p * 3}px); width:${Math.abs(p) % 20 === 0 ? 60 : 36}px"><b>${Math.abs(p)}</b></i>`;
        }
        return `<div class="horizon">
            <div class="horizon-inner"><div class="sky"></div><div class="ground"></div><i class="hline"></i>${lines}</div>
            <div class="horizon-plane"><svg viewBox="0 0 110 30"><path d="M5 15h30l8 8 12-8 12 8 8-8h30" stroke="#ffcc33" stroke-width="4" fill="none"/><circle cx="55" cy="15" r="3" fill="#ffcc33"/></svg></div>
            <div class="horizon-hdg">000°</div>
        </div>`;
    }

    function build(d) {
        const wrap = $('#vehicle .dial-wrap');
        const unit = d.unit;
        const key = `${d.kind}|${d.style}|${d.rpmMax}|${unit}`;
        if (key === built) return;
        built = key;

        $('#vehicle').className = `hud-el style-${d.style}` + (state.settings?.behaviour?.smoothSpeedo ? ' smooth' : '');
        $('#vehicle .fuel-gauge').innerHTML = fuelSvg();

        if (d.kind === 'car') {
            const max = d.rpmMax || 8;
            wrap.innerHTML = dialSvg(max, 1, 5, (max - 1) / max, (v) => v) + iconsHtml();
        } else if (d.kind === 'boat') {
            const max = unit === 'mph' ? 80 : 130;
            const step = unit === 'mph' ? 20 : 26;
            wrap.innerHTML = dialSvg(max, step, 4, 1, (v) => Math.round(v)) + `
                <div class="boat-power"><div class="pw"><span></span></div>
                <div class="st"><b class="fwd">${t('veh_forward')}</b><b class="rev">${t('veh_reverse')}</b><b class="anchor">⚓ ${t('veh_anchor')}</b></div></div>`;
        } else {
            const spdMax = unit === 'mph' ? 400 : 650;
            const altMax = unit === 'mph' ? 12000 : 4000;
            const altStep = unit === 'mph' ? 100 : 50;
            wrap.innerHTML = `<div class="air">
                ${tapeHtml('left', spdMax, 10, unit.toUpperCase())}
                ${horizonHtml()}
                ${tapeHtml('right', altMax, altStep, unit === 'mph' ? 'FT' : 'M')}
            </div><div class="air-gear"></div>`;
            wrap.dataset.altStep = altStep;
        }
        refreshEl('vehicle');
    }

    function animateSpeed() {
        const smooth = state.settings?.behaviour?.smoothSpeedo;
        shownSpeed = smooth ? shownSpeed + (targetSpeed - shownSpeed) * 0.35 : targetSpeed;
        if (Math.abs(targetSpeed - shownSpeed) < 0.5) shownSpeed = targetSpeed;
        const el = $('#vehicle .dial-speed');
        if (el) el.textContent = Math.round(shownSpeed);
        raf = shownSpeed !== targetSpeed ? requestAnimationFrame(animateSpeed) : null;
    }

    function setNeedle(v) {
        const g = $('#vehicle .dial-needle-g');
        if (!g) return;
        g.style.transform = `rotate(${START + SWEEP * clamp(v, 0, 1)}deg)`;
        $('#vehicle .dial-arc').setAttribute('stroke-dashoffset', 100 - clamp(v, 0, 1) * 100);
    }

    function update(d) {
        refreshEl('vehicle');
        if (d.none) return;
        build(d);

        const root = $('#vehicle');
        $('.veh-make', root).textContent = d.make ?? '';
        $('.veh-model', root).textContent = d.model ?? '';

        // Kraftstoff
        const fuel = clamp(d.fuel ?? 100, 0, 100);
        const lowFuel = fuel <= state.lowFuel;
        $('.f-arc', root)?.setAttribute('stroke-dashoffset', 100 - fuel);
        $('.fuel-gauge', root).classList.toggle('low', lowFuel);

        const alerts = [];
        if (lowFuel && state.settings?.behaviour?.lowFuelAlert) alerts.push(t('veh_low_fuel'));
        if (d.engine < 30) alerts.push(t('veh_engine'));
        $('.veh-alert', root).textContent = alerts.join(' · ');

        if (d.kind === 'car' || d.kind === 'boat') {
            const unit = $('.dial-unit', root);
            if (unit) unit.textContent = d.unit;
            targetSpeed = d.speed;
            if (!raf) raf = requestAnimationFrame(animateSpeed);
        }

        if (d.kind === 'car') {
            setNeedle(d.rpm);
            root.classList.toggle('dial-limiter', d.rpm >= 0.99);
            $('.dial-gear', root).textContent = d.gear;
            const icons = $('.dial-icons', root);
            $('.engine', icons).className = 'engine' + (d.engine < 60 ? ' on ' + (d.engine < 30 ? 'danger' : 'warn') : (d.engineOn ? ' on' : ''));
            $('.lights', icons).className = 'lights' + (d.lights > 0 ? ' on' : '') + (d.lights === 2 ? ' high' : '');
            $('.lock', icons).className = 'lock' + (d.locked ? ' on' : '');
        } else if (d.kind === 'boat') {
            const max = d.unit === 'mph' ? 80 : 130;
            setNeedle(d.speed / max);
            $('.dial-gear', root).textContent = d.reverse ? t('veh_gear_r') : (d.speed < 1 ? t('veh_gear_n') : 'F');
            $('.boat-power .pw span', root).style.width = `${d.power}%`;
            $('.boat-power .fwd', root).classList.toggle('on', !d.reverse && d.speed > 1);
            $('.boat-power .rev', root).classList.toggle('on', !!d.reverse);
            $('.boat-power .anchor', root).classList.toggle('on', !!d.anchored);
        } else {
            const tapes = $$('.tape', root);
            const altStep = Number($('.dial-wrap', root).dataset.altStep) || 100;
            tapes[0].querySelector('.tape-inner').style.transform = `translateY(${(d.speed / 10) * 20}px)`;
            tapes[0].querySelector('.tape-val').textContent = d.speed;
            tapes[1].querySelector('.tape-inner').style.transform = `translateY(${(Math.max(0, d.altitude) / altStep) * 20}px)`;
            tapes[1].querySelector('.tape-val').textContent = d.altitude;
            $('.horizon-inner', root).style.transform = `rotate(${-d.roll}deg) translateY(${d.pitch * 3}px)`;
            $('.horizon-hdg', root).textContent = `${String(Math.round((360 - d.heading) % 360)).padStart(3, '0')}°`;
            const gear = $('.air-gear', root);
            if (d.kind === 'plane') {
                gear.textContent = d.gearDown ? t('veh_gear_down') : t('veh_gear_up');
                gear.classList.toggle('up', !d.gearDown);
            } else {
                gear.textContent = '';
            }
        }
    }

    return { update, reset: () => { built = null; } };
})();

/* ===================== Layout ===================== */
const LAYOUT_ELEMENTS = ['status', 'compass', 'weapon', 'vehicle', 'money'];

function applyLayout() {
    const layout = state.settings?.layout ?? {};
    LAYOUT_ELEMENTS.forEach((id) => {
        const el = $('#' + id);
        const l = layout[id];
        el.style.left = el.style.top = el.style.right = el.style.bottom = '';
        el.style.setProperty('--s', l?.s ?? 1);
        if (l && l.x !== undefined) {
            el.style.left = `${l.x}%`;
            el.style.top = `${l.y}%`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
    });
}

function setLayout(id, patch) {
    state.settings.layout[id] = { ...(state.settings.layout[id] ?? {}), ...patch };
}

// Beispiel-Daten, damit im Editor alle Elemente sichtbar und greifbar sind
const PREVIEW = {
    vehicle: { kind: 'car', unit: 'km/h', speed: 88, rpm: 0.55, rpmMax: 8, gear: '3', fuel: 64, engine: 100, engineOn: true, lights: 1, locked: false, make: 'Grotti', model: 'Preview', style: 'neon' },
    weapon: { kind: 'rifle', name: 'Carbinerifle', clip: 27, reserve: 120 },
};

function setEditing(on) {
    state.editing = on;
    document.body.classList.toggle('editing', on);
    $('#settings').classList.toggle('hidden', on);
    $('#edit-bar').classList.toggle('hidden', !on);
    $('.edit-hint').textContent = t('layout_hint');
    $('#edit-done').textContent = t('layout_done');

    if (on) {
        ['vehicle', 'weapon'].forEach((k) => {
            if (!state.last[k] || state.last[k].none) handlers[k](PREVIEW[k], true);
        });
    } else {
        ['vehicle', 'weapon'].forEach((k) => handlers[k](state.last[k] ?? { none: true }));
        post('saveSettings', state.settings);
        renderSettings();
    }
    LAYOUT_ELEMENTS.forEach(refreshEl);
    if (state.last.status) onStatus(state.last.status);
}

(function initDrag() {
    let drag = null;
    document.addEventListener('mousedown', (e) => {
        if (!state.editing) return;
        const el = e.target.closest('.hud-el');
        if (!el) return;
        const r = el.getBoundingClientRect();
        // Bei Skalierung ist die sichtbare Box verschoben – Ursprung über offsetLeft/Top bestimmen
        drag = { el, dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop, w: r.width };
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!drag) return;
        const { el } = drag;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = `${e.clientX - drag.dx}px`;
        el.style.top = `${e.clientY - drag.dy}px`;
    });
    document.addEventListener('mouseup', () => {
        if (!drag) return;
        const { el } = drag;
        const x = (el.offsetLeft / window.innerWidth) * 100;
        const y = (el.offsetTop / window.innerHeight) * 100;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        setLayout(el.dataset.el, { x: +x.toFixed(2), y: +y.toFixed(2) });
        drag = null;
    });
    document.addEventListener('wheel', (e) => {
        if (!state.editing) return;
        const el = e.target.closest('.hud-el');
        if (!el) return;
        const s = clamp((parseFloat(el.style.getPropertyValue('--s')) || 1) + (e.deltaY < 0 ? 0.05 : -0.05), 0.5, 1.8);
        el.style.setProperty('--s', s.toFixed(2));
        setLayout(el.dataset.el, { s: +s.toFixed(2) });
    }, { passive: true });
})();

/* ===================== Einstellungsmenü ===================== */
const TABS = ['visibility', 'layout', 'behaviour'];
const SCHEMA = {
    visibility: [
        { group: 'group_hud', items: ['status', 'compass', 'weapon', 'vehicle'].map((k) => ({ comp: k })) },
        { group: 'group_minimap', items: ['minimap', 'gps', 'vehintro', 'voice', 'money'].map((k) => ({ comp: k })) },
    ],
    behaviour: [
        { group: 'group_minimap', items: ['minimapOnFoot', 'hideMinimap'] },
        { group: 'group_compass', items: ['compassOnFoot', 'compassFollowCam', 'streetNames', 'headingDegrees', 'compassBlips'] },
        { group: 'group_status', items: ['dynHealth', 'dynArmor', 'dynStamina', 'dynOxygen', 'dynHunger', 'dynThirst', 'dynStress'] },
        { group: 'group_vehicle', items: ['mph', 'smoothSpeedo', 'lowFuelAlert', 'chaseMode', { dial: true }] },
    ],
};
const DIAL_STYLES = ['auto', 'neon', 'sport', 'classic', 'carbon'];

function rowHtml(label, sub, on, attrs) {
    return `<div class="row" ${attrs}><div><b>${label}</b><small>${sub}</small></div><span class="toggle ${on ? 'on' : ''}"></span></div>`;
}

function renderSettings() {
    if (!state.settings) return;
    const s = state.settings;
    const root = $('#settings');
    $('.brand', root).textContent = t('menu_brand');
    $('.title', root).textContent = t('menu_title');
    $('.subtitle', root).textContent = t('menu_subtitle');
    $$('.set-tabs button', root).forEach((b) => {
        b.textContent = t('tab_' + b.dataset.tab);
        b.classList.toggle('active', b.dataset.tab === state.tab);
    });
    $('.foot-close', root).textContent = t('footer_close');
    $('.foot-defaults', root).textContent = t('footer_defaults');
    const [showAll, resetBtn] = $$('.side-actions button', root);
    showAll.querySelector('b').textContent = t('action_show_all');
    showAll.querySelector('small').textContent = t('action_show_all_sub');
    resetBtn.querySelector('b').textContent = t('action_reset');
    resetBtn.querySelector('small').textContent = t('action_reset_sub');
    $('.page', root).textContent = `${TABS.indexOf(state.tab) + 1} / ${TABS.length}`;
    setSide(t('tab_' + state.tab), t('tab_' + state.tab + '_head'));

    let html = `<small class="sec-kicker">0${TABS.indexOf(state.tab) + 1} / ${t('tab_' + state.tab)}</small>
        <h2 class="sec-head">${t('tab_' + state.tab + '_head')}</h2>
        <p class="sec-sub">${t('tab_' + state.tab + '_sub')}</p>`;

    if (state.tab === 'layout') {
        html += `<button class="big-btn" data-action="edit">✥ ${t('layout_edit')}</button>
            <p class="sec-sub" style="margin-top:10px">${t('layout_hint')}</p>
            <div class="group"><h3>${t('group_scale')}</h3>`;
        LAYOUT_ELEMENTS.forEach((id) => {
            const v = s.layout[id]?.s ?? 1;
            html += `<div class="scale-row"><b>${t('comp_' + id)}</b>
                <input type="range" min="0.5" max="1.8" step="0.05" value="${v}" data-scale="${id}">
                <span>${Math.round(v * 100)}%</span></div>`;
        });
        html += '</div>';
    } else {
        html += '<div class="groups">';
        SCHEMA[state.tab].forEach((g) => {
            html += `<div class="group"><h3>${t(g.group)}</h3>`;
            g.items.forEach((item) => {
                if (item.comp) {
                    html += rowHtml(t('comp_' + item.comp), t('opt_hint'), s.components[item.comp], `data-comp="${item.comp}"`);
                } else if (item.dial) {
                    html += `<div class="row" style="cursor:default"><div><b>${t('opt_dialStyle')}</b></div></div>
                        <div class="select" style="padding:0 10px 8px">${DIAL_STYLES.map((d) =>
                        `<button data-dial="${d}" class="${s.dialStyle === d ? 'active' : ''}">${d === 'auto' ? t('opt_dialAuto') : d}</button>`).join('')}</div>`;
                } else {
                    html += rowHtml(t('opt_' + item), t('opt_hint'), s.behaviour[item], `data-opt="${item}"`);
                }
            });
            html += '</div>';
        });
        html += '</div>';
    }
    $('.set-content', root).innerHTML = html;
}

function setSide(kicker, title) {
    $('#settings .side-kicker').textContent = kicker;
    $('#settings .side-title').textContent = title;
    $('#settings .side-desc').textContent = t('side_live');
}

function settingsChanged() {
    post('saveSettings', state.settings);
    applyComponentVisibility();
    vehicleRender.reset();
    if (state.last.vehicle) vehicleRender.update(state.last.vehicle);
    if (state.last.status) onStatus(state.last.status);
}

function switchTab(dir) {
    const i = (TABS.indexOf(state.tab) + dir + TABS.length) % TABS.length;
    state.tab = TABS[i];
    renderSettings();
}

function closeSettings() {
    if (state.editing) setEditing(false);
    post('saveSettings', state.settings);
    post('closeSettings');
    $('#settings').classList.add('hidden');
}

$('#settings').addEventListener('click', (e) => {
    const s = state.settings;
    const tab = e.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; renderSettings(); return; }

    const row = e.target.closest('.row[data-comp], .row[data-opt]');
    if (row) {
        if (row.dataset.comp) s.components[row.dataset.comp] = !s.components[row.dataset.comp];
        else s.behaviour[row.dataset.opt] = !s.behaviour[row.dataset.opt];
        renderSettings();
        settingsChanged();
        return;
    }

    const dial = e.target.closest('[data-dial]');
    if (dial) { s.dialStyle = dial.dataset.dial; renderSettings(); settingsChanged(); return; }

    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') closeSettings();
    if (action === 'edit') setEditing(true);
    if (action === 'showAll') {
        Object.keys(s.components).forEach((k) => { s.components[k] = true; });
        renderSettings();
        settingsChanged();
    }
    if (action === 'resetLayout') {
        s.layout = {};
        applyLayout();
        renderSettings();
        settingsChanged();
    }
    if (action === 'defaults') post('resetSettings');
});

$('#settings').addEventListener('mouseover', (e) => {
    const row = e.target.closest('.row');
    if (row) setSide(t('tab_' + state.tab), row.querySelector('b').textContent);
});

$('#settings').addEventListener('input', (e) => {
    const id = e.target.dataset.scale;
    if (!id) return;
    const v = parseFloat(e.target.value);
    setLayout(id, { s: v });
    $('#' + id).style.setProperty('--s', v);
    e.target.nextElementSibling.textContent = `${Math.round(v * 100)}%`;
});
$('#settings').addEventListener('change', (e) => {
    if (e.target.dataset.scale) post('saveSettings', state.settings);
});

$('#edit-done').addEventListener('click', () => setEditing(false));

document.addEventListener('keydown', (e) => {
    const open = !$('#settings').classList.contains('hidden');
    if (e.key === 'Escape') {
        if (state.editing) setEditing(false);
        else if (open) closeSettings();
        return;
    }
    if (!open) return;
    if (e.key === 'q' || e.key === 'Q') switchTab(-1);
    if (e.key === 'e' || e.key === 'E') switchTab(1);
});

/* ===================== Nachrichten aus Lua ===================== */
const handlers = {
    init: onInit,
    global: onGlobal,
    status: onStatus,
    compass: onCompass,
    weapon: (d, preview) => { if (!preview) state.last.weapon = d; onWeapon(d); },
    vehicle: (d, preview) => { if (!preview) state.last.vehicle = d; vehicleRender.update(d); vehicleIntro.update(d, preview); },
    money: onMoney,
    minimap: onMinimap,
    gps: onGps,
    voice: onVoice,
    settings: (d) => {
        $('#settings').classList.toggle('hidden', !d.open);
        if (d.open) renderSettings();
        else if (state.editing) setEditing(false);
    },
};

window.addEventListener('message', (e) => {
    const { action, data } = e.data || {};
    const fn = handlers[action];
    if (!fn) return;
    // Im Editor die Vorschau nicht durch "keine Daten" überschreiben
    if (state.editing && (action === 'vehicle' || action === 'weapon') && data?.none) {
        state.last[action] = data;
        return;
    }
    if (!['init', 'money', 'settings', 'weapon', 'vehicle'].includes(action)) state.last[action] = data;
    fn(data);
});

initStatusIcons();
post('ready');

/* ===================== Demo-Modus (nur im Browser) ===================== */
if (!IS_FIVEM) {
    document.body.classList.add('demo');
    const send = (action, data) => window.postMessage({ action, data }, '*');
    const params = new URLSearchParams(location.search);
    const kind = params.get('veh') || 'car';

    send('init', {
        locale: params.get('lang') || 'de',
        lowFuel: 15,
        settings: {
            components: { status: true, compass: true, weapon: true, vehicle: true, gps: true, minimap: true, voice: true, money: true, vehintro: true },
            behaviour: {
                minimapOnFoot: false, hideMinimap: false, compassOnFoot: true, compassFollowCam: true,
                streetNames: true, headingDegrees: true, compassBlips: true,
                dynHealth: false, dynArmor: false, dynStamina: false, dynOxygen: false,
                dynHunger: false, dynThirst: false, dynStress: false,
                mph: false, smoothSpeedo: true, lowFuelAlert: true, chaseMode: true,
            },
            dialStyle: params.get('style') || 'auto',
            layout: {},
        },
    });

    let tick = 0;
    setTimeout(() => setInterval(() => {
        tick++;
        const ph = tick / 30;
        const speed = Math.round(60 + Math.sin(ph) * 50);
        send('global', { show: true, cinematic: params.has('cinematic'), inVehicle: true });
        send('status', {
            health: 72, armor: 45, stamina: Math.round(60 + Math.sin(ph) * 40), oxygen: 100,
            hunger: 64, thirst: 38, stress: 22, wanted: params.has('wanted') ? 2 : 0,
            thresholds: { health: 100, armor: 100, stamina: 100, oxygen: 100, hunger: 90, thirst: 90, stress: 0 },
        });
        send('weapon', { kind: 'rifle', name: 'Carbinerifle', clip: 27, reserve: 210 });
        send('voice', { talking: tick % 40 < 15, mode: 2, modes: 3, radio: false, channel: 0 });
        const heading = (tick * 1.2) % 360;
        send('compass', {
            heading: Math.round(heading), showDegrees: true,
            street: 'Vespucci Blvd', cross: 'Palomino Ave', zone: 'Little Seoul',
            waypoint: { b: 40, d: '2.1 km' },
            blips: [{ b: 300, c: '#4da6ff' }, { b: 95, c: '#ffb347' }],
        });
        send('gps', { text: tick % 200 < 100 ? 'Scharf links' : 'Geradeaus', icon: tick % 200 < 100 ? 'sharp_left' : 'straight', junction: '80 m', total: '3.8 km' });
        send('minimap', { show: true, left: 0.0125, top: 0.79, width: 0.1406, height: 0.1762, chase: params.has('chase') });

        if (kind === 'car') {
            const rpm = clamp(0.25 + ((speed % 40) / 40) * 0.75, 0, 1);
            send('vehicle', {
                kind: 'car', unit: 'km/h', speed, rpm, rpmMax: 8, gear: String(1 + Math.floor(speed / 40)),
                fuel: params.has('lowfuel') ? 9 : 64, engine: 100, engineOn: true, lights: 1, locked: true,
                // Demo: im Menü gewählten Stil übernehmen (im Spiel löst Lua "auto" auf)
                make: 'Pegassi', model: 'Infernus',
                style: state.settings?.dialStyle && state.settings.dialStyle !== 'auto' ? state.settings.dialStyle : 'neon',
            });
        } else if (kind === 'boat') {
            send('vehicle', { kind: 'boat', unit: 'km/h', speed, power: 70, reverse: false, anchored: false, fuel: 80, engine: 100, engineOn: true, make: 'Shitzu', model: 'Speeder', style: 'neon' });
        } else {
            send('vehicle', {
                kind: 'plane', unit: 'km/h', speed: speed + 150, altitude: Math.round(800 + Math.sin(ph) * 200), altUnit: 'm',
                pitch: Math.sin(ph) * 10, roll: Math.cos(ph) * 20, heading: heading, gearDown: false,
                fuel: 70, engine: 100, engineOn: true, make: 'Mammoth', model: 'Dodo', style: 'neon',
            });
        }
        if (tick % 120 === 10) send('money', { account: 'cash', amount: 2500, minus: false, label: 'Bargeld' });
        if (tick % 120 === 60) send('money', { account: 'bank', amount: 480, minus: true, label: 'Bank' });
    }, 60), 300);

    if (params.has('settings')) setTimeout(() => send('settings', { open: true }), 600);
}
