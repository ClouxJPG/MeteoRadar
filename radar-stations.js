/* =========================================================
   radar-stations.js
   OPERA radar stations
   Россия и Украина исключены
   ========================================================= */

const OPERA_DATABASE_URL =
    "https://www.eumetnet.eu/wp-content/themes/aeron-child/observations-programme/current-activities/opera/database/OPERA_Database/OPERA_RADARS_DB.json";

const DEFAULT_RADAR_RADIUS_KM = 300;

const EXCLUDED_COUNTRIES = new Set([
    "RU",
    "RUS",
    "RUSSIA",
    "RUSSIAN FEDERATION",

    "UA",
    "UKR",
    "UKRAINE"
]);

let operaRadars = [];


/* =========================================================
   НОРМАЛИЗАЦИЯ СТРАНЫ
   ========================================================= */

function normalizeCountry(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .trim()
        .toUpperCase();

}


/* =========================================================
   ПРОВЕРКА РОССИИ / УКРАИНЫ
   ========================================================= */

function isExcludedCountry(country) {

    const c = normalizeCountry(country);

    return (
        EXCLUDED_COUNTRIES.has(c) ||
        c.includes("RUSSIA") ||
        c.includes("RUSSIAN") ||
        c.includes("UKRAINE")
    );

}


/* =========================================================
   ПОИСК ЗНАЧЕНИЯ В ОБЪЕКТЕ
   ========================================================= */

function findValue(object, names) {

    for (const name of names) {

        if (
            object[name] !== undefined &&
            object[name] !== null &&
            object[name] !== ""
        ) {
            return object[name];
        }

    }

    return null;

}


/* =========================================================
   ПРЕОБРАЗОВАНИЕ КООРДИНАТ
   ========================================================= */

function numberValue(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    const n = Number(
        String(value)
            .replace(",", ".")
            .trim()
    );

    return Number.isFinite(n) ? n : null;

}


/* =========================================================
   ПРЕОБРАЗОВАНИЕ РАДАРА
   ========================================================= */

function normalizeRadar(raw, index) {

    const lat = numberValue(
        findValue(raw, [
            "lat",
            "latitude",
            "LAT",
            "Latitude",
            "LATITUDE"
        ])
    );

    const lon = numberValue(
        findValue(raw, [
            "lon",
            "longitude",
            "lng",
            "LON",
            "Longitude",
            "LONGITUDE"
        ])
    );

    if (lat === null || lon === null) {
        return null;
    }

    if (lat < -90 || lat > 90) {
        return null;
    }

    if (lon < -180 || lon > 180) {
        return null;
    }

    const country = findValue(raw, [
        "country",
        "Country",
        "COUNTRY",
        "country_code",
        "countryCode",
        "CountryCode"
    ]);

    if (isExcludedCountry(country)) {
        return null;
    }

    const name = findValue(raw, [
        "name",
        "Name",
        "NAME",
        "location",
        "Location",
        "site",
        "Site",
        "station",
        "Station"
    ]) || `OPERA Radar ${index + 1}`;

    const code = findValue(raw, [
        "code",
        "Code",
        "CODE",
        "radar",
        "Radar",
        "RADAR",
        "id",
        "ID"
    ]) || `opera-${index + 1}`;

    const status = findValue(raw, [
        "status",
        "Status",
        "STATUS"
    ]);

    const radius = numberValue(
        findValue(raw, [
            "radius",
            "Radius",
            "RADIUS",
            "range",
            "Range",
            "range_km",
            "rangeKm"
        ])
    );

    return {

        id: String(code),

        name: String(name),

        country:
            country !== null
                ? String(country)
                : "",

        code: String(code),

        lat: lat,

        lon: lon,

        radius:
            radius && radius > 0
                ? radius
                : DEFAULT_RADAR_RADIUS_KM,

        active:
            status === null
                ? true
                : ![
                    "inactive",
                    "offline",
                    "closed",
                    "disabled"
                ].includes(
                    String(status).toLowerCase()
                ),

        raw: raw

    };

}


/* =========================================================
   ЗАГРУЗКА OPERA DATABASE
   ========================================================= */

async function loadOperaRadars() {

    try {

        const response =
            await fetch(
                OPERA_DATABASE_URL,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `OPERA HTTP ${response.status}`
            );

        }

        const json =
            await response.json();

        let source = json;

        /*
         * На случай, если OPERA вернёт:
         * { radars: [...] }
         * { data: [...] }
         * { stations: [...] }
         */

        if (
            json &&
            !Array.isArray(json)
        ) {

            source =
                json.radars ||
                json.stations ||
                json.data ||
                json.results ||
                [];

        }

        if (!Array.isArray(source)) {

            throw new Error(
                "Не удалось найти массив радаров OPERA"
            );

        }

        operaRadars =
            source
                .map(
                    (radar, index) =>
                        normalizeRadar(
                            radar,
                            index
                        )
                )
                .filter(Boolean);

        console.log(
            `OPERA: загружено ${operaRadars.length} радаров`
        );

        return operaRadars;

    } catch (error) {

        console.error(
            "Ошибка загрузки OPERA:",
            error
        );

        operaRadars = [];

        return [];

    }

}


/* =========================================================
   ПОЛУЧИТЬ ВСЕ РАДАРЫ
   ========================================================= */

function getOperaRadars() {

    return operaRadars.slice();

}


/* =========================================================
   ПОЛУЧИТЬ РАДАРЫ СТРОГО БЕЗ RU / UA
   ========================================================= */

function getAllowedOperaRadars() {

    return operaRadars.filter(
        radar =>
            !isExcludedCountry(
                radar.country
            )
    );

}


/* =========================================================
   ПОЛУЧИТЬ ДАННЫЕ ДЛЯ ТОЧЕК
   ========================================================= */

function getRadarMarkers() {

    return getAllowedOperaRadars()
        .map(radar => ({

            id: radar.id,

            lat: radar.lat,

            lon: radar.lon,

            name: radar.name,

            country: radar.country,

            code: radar.code,

            active: radar.active

        }));

}


/* =========================================================
   ПОЛУЧИТЬ ДАННЫЕ ДЛЯ КРУГОВ
   ========================================================= */

function getRadarCoverage() {

    return getAllowedOperaRadars()
        .map(radar => ({

            id: radar.id,

            lat: radar.lat,

            lon: radar.lon,

            name: radar.name,

            country: radar.country,

            code: radar.code,

            radius:
                radar.radius * 1000,

            active: radar.active

        }));

}


/* =========================================================
   НАЙТИ БЛИЖАЙШИЙ РАДАР
   ========================================================= */

function findNearestRadar(
    latitude,
    longitude
) {

    let nearest = null;

    let nearestDistance =
        Infinity;

    for (
        const radar
        of getAllowedOperaRadars()
    ) {

        const distance =
            getDistanceKm(
                latitude,
                longitude,
                radar.lat,
                radar.lon
            );

        if (
            distance <
            nearestDistance
        ) {

            nearestDistance =
                distance;

            nearest = radar;

        }

    }

    return {

        radar: nearest,

        distance:
            nearest
                ? nearestDistance
                : null

    };

}


/* =========================================================
   РАССТОЯНИЕ
   ========================================================= */

function getDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (
            lat2 - lat1
        ) *
        Math.PI /
        180;

    const dLon =
        (
            lon2 - lon1
        ) *
        Math.PI /
        180;

    const a =
        Math.sin(dLat / 2) ** 2 +

        Math.cos(
            lat1 *
            Math.PI /
            180
        ) *

        Math.cos(
            lat2 *
            Math.PI /
            180
        ) *

        Math.sin(dLon / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;

}


/* =========================================================
   ЭКСПОРТ
   ========================================================= */

window.RadarStations = {

    load:
        loadOperaRadars,

    getAll:
        getAllowedOperaRadars,

    getMarkers:
        getRadarMarkers,

    getCoverage:
        getRadarCoverage,

    findNearest:
        findNearestRadar,

    distanceKm:
        getDistanceKm

};
