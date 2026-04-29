const STORAGE_KEY = 'custom_continue_watching_v1';
const WATCHED_THRESHOLD_SECONDS = 300; // 5 minutes = "watched"

const safeParse = (value) => {
    try {
        return JSON.parse(value);
    } catch (_error) {
        return null;
    }
};

const getEntriesMap = () => {
    if (typeof localStorage === 'undefined') {
        return {};
    }
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
};

const setEntriesMap = (value) => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const getEntryKey = ({ subjectId, type, season, episode }) => {
    return [subjectId, type, season ?? 'movie', episode ?? 'movie'].join(':');
};

const saveProgress = (payload) => {
    const {
        subjectId,
        type,
        season = null,
        episode = null,
        title = '',
        poster = '',
        year = '',
        genre = '',
        time = 0,
        duration = 0
    } = payload || {};

    if (!subjectId || typeof type !== 'string' || typeof time !== 'number' || typeof duration !== 'number' || isNaN(time) || isNaN(duration)) {
        return;
    }

    const roundedTime = Math.max(0, Math.floor(time));
    const roundedDuration = Math.max(0, Math.floor(duration));
    const key = getEntryKey({ subjectId, type, season, episode });
    const entries = getEntriesMap();

    // Don't save trivial progress and clear almost-finished titles.
    if (roundedTime < 30 || (roundedDuration > 0 && roundedDuration - roundedTime < 20)) {
        delete entries[key];
        setEntriesMap(entries);
        return;
    }

    entries[key] = {
        subjectId: String(subjectId),
        type,
        season: typeof season === 'number' ? season : null,
        episode: typeof episode === 'number' ? episode : null,
        title,
        poster,
        year,
        genre,
        time: roundedTime,
        duration: roundedDuration,
        updatedAt: Date.now()
    };

    setEntriesMap(entries);
};

const removeProgress = ({ subjectId, type, season = null, episode = null }) => {
    if (!subjectId || typeof type !== 'string') {
        return;
    }
    const key = getEntryKey({ subjectId, type, season, episode });
    const entries = getEntriesMap();
    delete entries[key];
    setEntriesMap(entries);
};

const getResumeTime = ({ subjectId, type, season = null, episode = null }) => {
    if (!subjectId || typeof type !== 'string') {
        return 0;
    }
    const key = getEntryKey({ subjectId, type, season, episode });
    const entry = getEntriesMap()[key];
    return typeof entry?.time === 'number' ? entry.time : 0;
};

const hasWatched = ({ subjectId, type, season = null, episode = null }) => {
    const time = getResumeTime({ subjectId, type, season, episode });
    return time >= WATCHED_THRESHOLD_SECONDS;
};

const getProgressPercent = ({ subjectId, type, season = null, episode = null }) => {
    const key = getEntryKey({ subjectId, type, season, episode });
    const entry = getEntriesMap()[key];
    if (!entry || typeof entry.time !== 'number' || typeof entry.duration !== 'number' || entry.duration <= 0) {
        return 0;
    }
    return Math.min(100, Math.max(0, (entry.time / entry.duration) * 100));
};

const getContinueWatchingItems = () => {
    const entries = Object.values(getEntriesMap())
        .filter((entry) => entry && typeof entry === 'object')
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
        .slice(0, 24);

    return entries.map((entry) => {
        const videoId = entry.type === 'series' && entry.season !== null && entry.episode !== null ?
            `${entry.subjectId}:${entry.season}:${entry.episode}` :
            null;
        const href = videoId ?
            `#/metadetails/${entry.type}/${encodeURIComponent(entry.subjectId)}/${encodeURIComponent(videoId)}` :
            `#/metadetails/${entry.type}/${encodeURIComponent(entry.subjectId)}`;
        const progress = entry.duration > 0 ? Math.min(100, Math.max(0, (entry.time / entry.duration) * 100)) : 0;
        return {
            id: entry.subjectId,
            title: entry.title,
            poster: entry.poster,
            type: entry.type,
            year: entry.year || '',
            genre: entry.genre || '',
            season: entry.season,
            episode: entry.episode,
            time: entry.time,
            duration: entry.duration,
            progress,
            updatedAt: entry.updatedAt,
            href
        };
    });
};

// Legacy function for compatibility
const getContinueWatchingSection = () => {
    return getContinueWatchingItems().map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.poster,
        type: item.type,
        year: item.year,
        genre: item.genre,
        rating: '',
        href: item.href
    }));
};

module.exports = {
    saveProgress,
    removeProgress,
    getResumeTime,
    hasWatched,
    getProgressPercent,
    getContinueWatchingItems,
    getContinueWatchingSection,
    WATCHED_THRESHOLD_SECONDS
};
