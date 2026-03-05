/**
 * Nawaetu Extension – Popup Script
 * Features: prayer times, countdown, Ramadan mode, bilingual, verse, adzan reminders
 */

const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const SHOLAT_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const CACHE_KEY_PRAYERS = 'nawaetu_ext_prayers_v4';
const CACHE_KEY_VERSE = 'nawaetu_ext_verse_v2';
const CACHE_KEY_LANG = 'nawaetu_ext_lang';
const CACHE_KEY_OFFSET = 'nawaetu_ext_hijri_offset';
const CACHE_KEY_NOTIF = 'nawaetu_ext_notif';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const REMINDER_MINUTES = 15; // Show "Bersiap" reminder this many minutes before prayer

// ── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
    id: {
        nextPrayer: 'Sholat Berikutnya', towardsPrayer: 'menuju sholat',
        verseLabel: '📖 Ayat Hari Ini', openFull: 'Buka Lengkap',
        detectingLoc: 'Mendeteksi lokasi…', allowLocation: 'Izinkan Lokasi',
        locationDenied: 'Jakarta (default)',
        prayerNames: {
            Fajr: 'Subuh', Sunrise: 'Terbit', Dhuhr: 'Dzuhur',
            Asr: 'Ashar', Maghrib: 'Maghrib', Isha: "Isya'"
        },
        ramadanDay: 'Ramadan Hari ke-', ramadanLabel: 'Ramadan',
        imsak: 'Imsak', sahur: 'Sahur berakhir', buka: 'Buka Puasa',
        bersiap: '⚠️ Bersiap sholat!', adzanNear: 'Waktu adzan dalam',
        hijriOffset: 'Koreksi Tanggal Hijriyah',
        notifOn: '🔔', notifOff: '🔕',
        notifTooltipOn: 'Notifikasi adzan aktif', notifTooltipOff: 'Aktifkan notifikasi adzan'
    },
    en: {
        nextPrayer: 'Next Prayer', towardsPrayer: 'to prayer',
        verseLabel: '📖 Verse of the Day', openFull: 'Open Full App',
        detectingLoc: 'Detecting location…', allowLocation: 'Allow Location',
        locationDenied: 'Jakarta (default)',
        prayerNames: {
            Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr',
            Asr: 'Asr', Maghrib: 'Maghrib', Isha: "Isha'a"
        },
        ramadanDay: 'Ramadan Day ', ramadanLabel: 'Ramadan',
        imsak: 'Imsak', sahur: 'Sahur ends', buka: 'Iftar',
        bersiap: '⚠️ Prepare for prayer!', adzanNear: 'Adzan in',
        hijriOffset: 'Hijri Date Correction',
        notifOn: '🔔', notifOff: '🔕',
        notifTooltipOn: 'Adzan notifications active', notifTooltipOff: 'Enable adzan notifications'
    }
};

let lang = localStorage.getItem(CACHE_KEY_LANG) || 'id';
let hijriOffset = parseInt(localStorage.getItem(CACHE_KEY_OFFSET) ?? '-1', 10);
let notifEnabled = localStorage.getItem(CACHE_KEY_NOTIF) === 'true';
let countdownInterval = null;
let globalTimings = null;
let reminderShown = false;

// ── MAIN ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    renderDate();
    renderHijriOffsetControl();
    renderNotifToggle();
    await requestLocationAndLoad();
    await loadVerse();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('lang-toggle').addEventListener('click', () => {
        lang = lang === 'id' ? 'en' : 'id';
        localStorage.setItem(CACHE_KEY_LANG, lang);
        applyLang();
        if (globalTimings) renderPrayers(globalTimings.timings, globalTimings.hijri);
    });
}

function applyLang() {
    document.getElementById('lang-toggle').textContent = lang === 'id' ? 'EN' : 'ID';
    document.getElementById('open-web-btn').textContent = '↗ ' + t('openFull');
    document.getElementById('countdown-label').textContent = t('towardsPrayer');
    document.getElementById('verse-label').textContent = t('verseLabel');
    document.getElementById('hijri-offset-label').textContent = t('hijriOffset');
    if (globalTimings) renderPrayers(globalTimings.timings, globalTimings.hijri);
}

function t(key) { return (T[lang] && T[lang][key] != null) ? T[lang][key] : T.id[key]; }

// ── DATE ─────────────────────────────────────────────────────────────────────
function renderDate() {
    const now = new Date();
    const days = {
        id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    const months = {
        id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    };
    document.getElementById('date-gregorian').textContent =
        `${days[lang][now.getDay()]}, ${now.getDate()} ${months[lang][now.getMonth()]} ${now.getFullYear()}`;
}

// ── HIJRI OFFSET ─────────────────────────────────────────────────────────────
function renderHijriOffsetControl() {
    document.getElementById('hijri-offset-value').textContent = hijriOffset >= 0 ? `+${hijriOffset}` : String(hijriOffset);
    document.getElementById('hijri-offset-label').textContent = t('hijriOffset');

    document.getElementById('offset-minus').addEventListener('click', () => {
        if (hijriOffset > -3) {
            hijriOffset--;
            localStorage.setItem(CACHE_KEY_OFFSET, hijriOffset);
            document.getElementById('hijri-offset-value').textContent = hijriOffset >= 0 ? `+${hijriOffset}` : String(hijriOffset);
            if (globalTimings) renderPrayers(globalTimings.timings, globalTimings.hijri);
        }
    });
    document.getElementById('offset-plus').addEventListener('click', () => {
        if (hijriOffset < 3) {
            hijriOffset++;
            localStorage.setItem(CACHE_KEY_OFFSET, hijriOffset);
            document.getElementById('hijri-offset-value').textContent = hijriOffset >= 0 ? `+${hijriOffset}` : String(hijriOffset);
            if (globalTimings) renderPrayers(globalTimings.timings, globalTimings.hijri);
        }
    });
}

// ── NOTIFICATION TOGGLE ───────────────────────────────────────────────────────
function renderNotifToggle() {
    const btn = document.getElementById('notif-toggle');
    btn.textContent = notifEnabled ? t('notifOn') : t('notifOff');
    btn.title = notifEnabled ? t('notifTooltipOn') : t('notifTooltipOff');
    btn.classList.toggle('active', notifEnabled);

    btn.addEventListener('click', async () => {
        if (!notifEnabled) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                notifEnabled = true;
                localStorage.setItem(CACHE_KEY_NOTIF, 'true');
                if (globalTimings) scheduleAdzanNotifications(globalTimings.timings);
                new Notification('Nawaetu 🕌', { body: lang === 'id' ? 'Notifikasi adzan diaktifkan.' : 'Adzan notifications enabled.' });
            }
        } else {
            notifEnabled = false;
            localStorage.setItem(CACHE_KEY_NOTIF, 'false');
        }
        btn.textContent = notifEnabled ? t('notifOn') : t('notifOff');
        btn.title = notifEnabled ? t('notifTooltipOn') : t('notifTooltipOff');
        btn.classList.toggle('active', notifEnabled);
    });
}

// ── GEOLOCATION ───────────────────────────────────────────────────────────────
async function requestLocationAndLoad() {
    // Clear ALL old cache keys to prevent stale city name
    localStorage.removeItem('nawaetu_ext_prayers_v2');
    localStorage.removeItem('nawaetu_ext_prayers_v3');

    // Check if already granted – if so, always fetch fresh GPS (no cache)
    if (navigator.permissions) {
        try {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            if (status.state === 'granted') {
                // Use fresh GPS every time popup is opened
                document.getElementById('location-name').textContent = t('detectingLoc');
                localStorage.removeItem(CACHE_KEY_PRAYERS); // always refresh
                const pos = await getCoords();
                await loadPrayersWithCoords(pos.coords.latitude, pos.coords.longitude, false);
                return;
            }
            if (status.state === 'denied') {
                document.getElementById('location-name').textContent = t('locationDenied');
                await loadPrayersWithCoords(-6.2088, 106.8456, true);
                return;
            }
        } catch (_) { /* ignore */ }
    }

    // Fallback: check cache then prompt
    const cached = readCache(CACHE_KEY_PRAYERS);
    if (cached && !cached.isDefault) {
        globalTimings = cached;
        setLocationUI(cached.city);
        renderPrayers(cached.timings, cached.hijri);
        return;
    }

    // Prompt user
    showLocationPrompt();
}

function setLocationUI(cityName) {
    document.getElementById('location-name').innerHTML =
        `${cityName} <button id="refresh-loc-btn" class="refresh-loc-btn" title="Perbarui lokasi">🔄</button>`;
    document.getElementById('refresh-loc-btn').addEventListener('click', async () => {
        localStorage.removeItem(CACHE_KEY_PRAYERS);
        document.getElementById('location-name').textContent = t('detectingLoc');
        try {
            const pos = await getCoords();
            await loadPrayersWithCoords(pos.coords.latitude, pos.coords.longitude, false);
        } catch {
            document.getElementById('location-name').textContent = t('locationDenied');
            await loadPrayersWithCoords(-6.2088, 106.8456, true);
        }
    });
}

function showLocationPrompt() {
    document.getElementById('location-name').innerHTML =
        `<button id="allow-loc-btn" class="allow-loc-btn">${t('allowLocation')} 📍</button>`;
    document.getElementById('allow-loc-btn').addEventListener('click', async () => {
        document.getElementById('location-name').textContent = t('detectingLoc');
        localStorage.removeItem(CACHE_KEY_PRAYERS);
        try {
            const pos = await getCoords();
            await loadPrayersWithCoords(pos.coords.latitude, pos.coords.longitude, false);
        } catch {
            document.getElementById('location-name').textContent = t('locationDenied');
            await loadPrayersWithCoords(-6.2088, 106.8456, true);
        }
    });
}

async function loadPrayersWithCoords(lat, lon, isDefault) {
    try {
        const today = getTodayString();
        const method = "20";
        const maghribTune = getMaghribCorrection(lat, lon);
        // Tune format: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
        const tuneParam = `2,2,0,4,4,${maghribTune},0,2,0`;
        const url = `https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lon}&method=${method}&tune=${tuneParam}`;

        const res = await fetch(url);
        const json = await res.json();
        if (json.code !== 200) throw new Error();

        const timings = json.data.timings;
        const hijri = json.data.date.hijri;

        // Use BigDataCloud reverse geocoding for real city name
        let city = isDefault ? 'Jakarta (default)' : await getRealCityName(lat, lon);

        setLocationUI(city);

        const payload = { timings, city, hijri, isDefault };
        globalTimings = payload;
        saveCache(CACHE_KEY_PRAYERS, payload);
        renderPrayers(timings, hijri);

        if (notifEnabled) scheduleAdzanNotifications(timings);
    } catch {
        document.getElementById('prayer-grid').innerHTML =
            '<p style="color:#64748b;font-size:12px;text-align:center;padding:8px 0;grid-column:span 6">Gagal memuat jadwal sholat</p>';
    }
}

function getMaghribCorrection(lat, lng) {
    const R = 6371;
    const dLat = (lat - (-6.9175)) * Math.PI / 180;
    const dLng = (lng - 107.6191) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(-6.9175 * Math.PI / 180) * Math.cos(lat * Math.PI / 180)
        * Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distKm <= 25) return 8; // Bandung Raya
    return 3; // Other Indonesian cities
}

async function getRealCityName(lat, lon) {
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
        const res = await fetch(url);
        const json = await res.json();
        // Prefer city > locality > principalSubdivision > countryName
        const city = json.city || json.locality || json.principalSubdivision || json.countryName || 'Lokasi Kamu';
        return city;
    } catch {
        return 'Lokasi Kamu';
    }
}

// ── PRAYERS ──────────────────────────────────────────────────────────────────
function renderPrayers(timings, hijri) {
    renderDate();
    const grid = document.getElementById('prayer-grid');
    const pNames = T[lang].prayerNames;
    const now = new Date();

    // Apply Hijri offset for Ramadan detection
    const rawHijriDay = hijri ? parseInt(hijri.day, 10) : 1;
    const hijriMonth = hijri ? parseInt(hijri.month.number, 10) : 0;
    const adjustedDay = rawHijriDay + hijriOffset;
    const isRamadan = hijriMonth === 9;

    // Ramadan banner
    const banner = document.getElementById('ramadan-banner');
    if (isRamadan) {
        const displayDay = Math.max(1, Math.min(30, adjustedDay));
        document.getElementById('ramadan-day-num').textContent = displayDay;
        document.getElementById('ramadan-banner-label').textContent =
            lang === 'id' ? `Ramadan Hari ke-${displayDay}` : `Ramadan Day ${displayDay}`;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }

    // Imsak = Fajr - 10 min
    const imsakTime = subtractMinutes(timings['Fajr'], 10);

    // Ramadan highlights
    const rhSection = document.getElementById('ramadan-highlights');
    if (isRamadan) {
        document.getElementById('rh-imsak-label').textContent = t('imsak');
        document.getElementById('rh-imsak-time').textContent = imsakTime;
        document.getElementById('rh-sahur-label').textContent = t('sahur');
        document.getElementById('rh-sahur-time').textContent = timings['Fajr'].slice(0, 5);
        document.getElementById('rh-buka-label').textContent = t('buka');
        document.getElementById('rh-buka-time').textContent = timings['Maghrib'].slice(0, 5);
        rhSection.style.display = 'flex';
    } else {
        rhSection.style.display = 'none';
    }

    // Next prayer countdown
    const nextPrayer = getNextSholat(timings, now);
    if (nextPrayer) {
        document.getElementById('next-prayer-name').textContent = pNames[nextPrayer.name] || nextPrayer.name;
        document.getElementById('next-prayer-time-label').textContent = nextPrayer.time.slice(0, 5);
        document.getElementById('next-prayer-label').textContent = t('nextPrayer');
        document.getElementById('countdown-label').textContent = t('towardsPrayer');
        startCountdown(nextPrayer.date, pNames[nextPrayer.name] || nextPrayer.name);
    }

    // Prayer grid (6 columns: Subuh, Terbit, Dzuhur, Ashar, Maghrib, Isya)
    grid.innerHTML = '';
    PRAYER_NAMES.forEach(name => {
        const rawTime = timings[name]; if (!rawTime) return;
        const isActive = nextPrayer && nextPrayer.name === name;
        const isIftar = isRamadan && name === 'Maghrib';
        const isSahur = isRamadan && name === 'Fajr';
        const item = document.createElement('div');
        item.className = ['prayer-item', isActive && 'active', isIftar && 'iftar', isSahur && 'sahur']
            .filter(Boolean).join(' ');
        item.innerHTML = `<div class="prayer-item-name">${pNames[name] || name}</div>
                      <div class="prayer-item-time">${rawTime.slice(0, 5)}</div>`;
        grid.appendChild(item);
    });
}

function getNextSholat(timings, now) {
    const today = now.toISOString().split('T')[0];
    for (const name of SHOLAT_NAMES) {
        const raw = timings[name]; if (!raw) continue;
        const [h, m] = raw.split(':').map(Number);
        const dt = new Date(`${today}T${pad(h)}:${pad(m)}:00`);
        if (dt > now) return { name, time: raw, date: dt };
    }
    // Tomorrow Fajr
    const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
    const ts = tmrw.toISOString().split('T')[0];
    const fajr = timings['Fajr'];
    if (fajr) {
        const [h, m] = fajr.split(':').map(Number);
        return { name: 'Fajr', time: fajr, date: new Date(`${ts}T${pad(h)}:${pad(m)}:00`) };
    }
    return null;
}

function startCountdown(targetDate, prayerLabel) {
    if (countdownInterval) clearInterval(countdownInterval);
    reminderShown = false;
    const valueEl = document.getElementById('countdown-value');
    const labelEl = document.getElementById('countdown-label');
    const cardEl = document.querySelector('.next-prayer-card');
    const nameEl = document.getElementById('next-prayer-name');

    function update() {
        const diff = Math.max(0, targetDate - new Date());
        const minutes = Math.floor(diff / 60000);
        const hh = Math.floor(diff / 3600000);
        const mm = Math.floor((diff % 3600000) / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        valueEl.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;

        // ── Bersiap reminder: within REMINDER_MINUTES
        if (minutes < REMINDER_MINUTES && minutes >= 0 && diff > 0) {
            if (!reminderShown) {
                reminderShown = true;
                cardEl.classList.add('bersiap');
                // Notification (if user allowed)
                if (notifEnabled && Notification.permission === 'granted') {
                    new Notification(`🕌 ${prayerLabel} – Nawaetu`, {
                        body: lang === 'id'
                            ? `Bersiap, waktu adzan ${prayerLabel} dalam ${minutes} menit.`
                            : `Prepare! ${prayerLabel} adhan in ${minutes} minutes.`,
                        icon: 'icons/icon-128.png'
                    });
                }
            }
            labelEl.textContent = t('bersiap').replace('⚠️ ', '');
            valueEl.classList.add('urgent');
        } else {
            cardEl.classList.remove('bersiap');
            valueEl.classList.remove('urgent');
            labelEl.textContent = t('towardsPrayer');
            if (diff === 0) {
                // Adzan time reached!
                clearInterval(countdownInterval);
                cardEl.classList.add('adzan');
                nameEl.textContent = lang === 'id' ? `🕌 Adzan ${prayerLabel}!` : `🕌 Adhan ${prayerLabel}!`;
                valueEl.textContent = lang === 'id' ? 'Allahu Akbar' : 'God is Greatest';
                if (notifEnabled && Notification.permission === 'granted') {
                    new Notification(`🕌 Waktu Adzan – ${prayerLabel}`, {
                        body: lang === 'id' ? `Allahu Akbar! Waktu ${prayerLabel} telah tiba.` : `Allahu Akbar! Time for ${prayerLabel}.`,
                        icon: 'icons/icon-128.png'
                    });
                }
            }
        }
    }
    update();
    countdownInterval = setInterval(update, 1000);
}

// ── ADZAN NOTIFICATIONS ───────────────────────────────────────────────────────
function scheduleAdzanNotifications(timings) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    // Chrome extensions can't use persistent alarms from popup.js
    // We show a reminder via countdown when popup is open.
    // Background service worker (background.js) handles persistent alarms.
    // Send timings to background via chrome.runtime.sendMessage
    if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'SCHEDULE_ALARMS', timings });
    }
}

// ── VERSE ─────────────────────────────────────────────────────────────────────
async function loadVerse() {
    const cached = readCache(CACHE_KEY_VERSE);
    if (cached) { renderVerse(cached); return; }
    try {
        const verseNum = (getDayOfYear() % 6236) + 1;
        const res = await fetch(`https://quranenc.com/api/v1/translation/aya/indonesian_mokhtasar/${verseNum}`);
        const json = await res.json();
        if (!json.result) throw new Error();
        const d = { arabic: json.result.arabic_text, translation: json.result.translation, ref: `Q.S ${json.result.sura}:${json.result.aya}` };
        saveCache(CACHE_KEY_VERSE, d); renderVerse(d);
    } catch {
        try {
            const res = await fetch('https://quranenc.com/api/v1/translation/aya/indonesian_mokhtasar/255');
            const json = await res.json();
            const d = { arabic: json.result.arabic_text, translation: json.result.translation, ref: `Q.S ${json.result.sura}:${json.result.aya}` };
            saveCache(CACHE_KEY_VERSE, d); renderVerse(d);
        } catch {
            document.getElementById('verse-area').innerHTML = '<p style="color:#64748b;font-size:12px">Gagal memuat ayat.</p>';
        }
    }
}

function renderVerse(data) {
    document.getElementById('verse-arabic').textContent = data.arabic;
    document.getElementById('verse-translation').textContent = `"${data.translation}"`;
    document.getElementById('verse-ref').textContent = data.ref;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function subtractMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m - mins;
    return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}
function getCoords() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('No geolocation'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
    });
}
function getTodayString() {
    const n = new Date();
    return `${pad(n.getDate())}-${pad(n.getMonth() + 1)}-${n.getFullYear()}`;
}
function getDayOfYear() {
    const n = new Date();
    return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
}
function pad(n) { return String(n).padStart(2, '0'); }
function readCache(key) {
    try {
        const raw = localStorage.getItem(key); if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
        return data;
    } catch { return null; }
}
function saveCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch { }
}
