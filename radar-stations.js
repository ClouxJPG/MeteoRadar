/* =========================================================
   radar-stations.js
   OPERA / LibreWXR radar stations
   Россия и Украина исключены
   ========================================================= */

const RADAR_COVERAGE_RADIUS_KM = 300;

/*
 * Список стран, которые не должны отображаться.
 * Россия и Украина исключены специально.
 */
const EXCLUDED_COUNTRIES = new Set([
    "Russia",
    "Russian Federation",
    "RU",
    "Ukraine",
    "UA"
]);

/*
 * Базовый список OPERA-радаров.
 *
 * Структура:
 * {
 *   id:       уникальный ID станции
 *   name:     название
 *   country:  страна
 *   code:     OPERA/ODIM код
 *   lat:      широта
 *   lon:      долгота
 *   radius:   радиус покрытия в км
 *   active:   активна ли станция
 * }
 *
 * Координаты сюда будут загружаться из актуальной
 * базы OPERA, а не задаваться приблизительно.
 */

const OPERA_RADARS = [];


/* =========================================================
   ПРОВЕРКА СТАНЦИИ
   ========================================================= */

function isRadarAllowed(radar) {

    if (!radar) return false;

    if (
        radar.country &&
        EXCLUDED_COUNTRIES.has(String(radar.country).trim())
    ) {
        return false;
    }

    if (
        typeof radar.lat !== "number" ||
        typeof radar.lon !== "number"
    ) {
        return false;
    }

    if (
        radar.lat < -90 ||
        radar.lat > 90 ||
        radar.lon < -180 ||
        radar.lon > 180
    ) {
        return false;
    }

    return true;
}


/* =========================================================
   ПОЛУЧЕНИЕ РАЗРЕШЁННЫХ РАДАРОВ
   ========================================================= */

function getOperaRadars() {

    return OPERA_RADARS.filter(isRadarAllowed);

}


/* =========================================================
   РАДИУС В МЕТРАХ
   ========================================================= */

function getRadarRadiusMeters(radar) {

    const radius =
        Number(radar.radius) > 0
            ? Number(radar.radius)
            : RADAR_COVERAGE_RADIUS_KM;

    return radius * 1000;

}


/* =========================================================
   СОЗДАНИЕ ДАННЫХ ДЛЯ LEAFLET
   ========================================================= */

function createRadarStationData(radar) {

    return {

        id: radar.id || radar.code,

        name:
            radar.name ||
            "Радар OPERA",

        country:
            radar.country ||
            "",

        code:
            radar.code ||
            "",

        lat:
            Number(radar.lat),

        lon:
            Number(radar.lon),

        radius:
            getRadarRadiusMeters(radar),

        active:
            radar.active !== false

    };

}


/* =========================================================
   ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ КАРТЫ
   ========================================================= */

function getRadarStationData() {

    return getOperaRadars()
        .map(createRadarStationData);

}


/* =========================================================
   СОЗДАНИЕ ТОЧКИ РАДАРА
   ========================================================= */

function createRadarMarkerData(radar) {

    return {

        lat: radar.lat,

        lon: radar.lon,

        title:
            radar.name || "Радар OPERA",

        code:
            radar.code || "",

        country:
            radar.country || "",

        active:
            radar.active !== false

    };

}


/* =========================================================
   СОЗДАНИЕ ЗОНЫ ПОКРЫТИЯ
   ========================================================= */

function createRadarCoverageData(radar) {

    return {

        lat: radar.lat,

        lon: radar.lon,

        radius:
            radar.radius,

        name:
            radar.name || "Радар OPERA",

        code:
            radar.code || "",

        country:
            radar.country || "",

        active:
            radar.active !== false

    };

}


/* =========================================================
   ПОЛУЧЕНИЕ ВСЕХ ЗОН ПОКРЫТИЯ
   ========================================================= */

function getRadarCoverageData() {

    return getRadarStationData()
        .map(createRadarCoverageData);

}


/* =========================================================
   ИНФОРМАЦИЯ О РАДАРЕ
   ========================================================= */

function getRadarInfo(radar) {

    return {

        name:
            radar.name || "Неизвестный радар",

        country:
            radar.country || "—",

        code:
            radar.code || "—",

        coordinates:
            `${radar.lat.toFixed(4)}, ${radar.lon.toFixed(4)}`,

        radius:
            `${Math.round(radar.radius / 1000)} км`,

        status:
            radar.active
                ? "Активен"
                : "Неактивен"

    };

}


/* =========================================================
   ФИЛЬТРАЦИЯ ПО СТРАНЕ
   ========================================================= */

function getRadarsByCountry(country) {

    return getRadarStationData()
        .filter(radar =>
            radar.country === country
        );

}


/* =========================================================
   ПОИСК РАДАРА
   ========================================================= */

function findRadarById(id) {

    return getRadarStationData()
        .find(radar =>
            radar.id === id
        );

}


/* =========================================================
   ПОИСК БЛИЖАЙШЕГО РАДАРА
   ========================================================= */

function findNearestRadar(lat, lon) {

    let nearest = null;
    let nearestDistance = Infinity;

    getRadarStationData()
        .forEach(radar => {

            const distance =
                getDistanceKm(
                    lat,
                    lon,
                    radar.lat,
                    radar.lon
                );

            if (distance < nearestDistance) {

                nearestDistance = distance;
                nearest = radar;

            }

        });

    return {

        radar: nearest,

        distance:
            nearest
                ? nearestDistance
                : null

    };

}


/* =========================================================
   РАССТОЯНИЕ МЕЖДУ ДВУМЯ КООРДИНАТАМИ
   ========================================================= */

function getDistanceKm(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
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
   ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
   ========================================================= */

window.RadarStations = {

    getAll:
        getRadarStationData,

    getCoverage:
        getRadarCoverageData,

    getInfo:
        getRadarInfo,

    getByCountry:
        getRadarsByCountry,

    findById:
        findRadarById,

    findNearest:
        findNearestRadar,

    distanceKm:
        getDistanceKm,

    coverageRadiusKm:
        RADAR_COVERAGE_RADIUS_KM

};
