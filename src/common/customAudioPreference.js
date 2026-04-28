const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const AUDIO_PREFERENCES = {
    ORIGINAL: 'original',
    FRENCH: 'french'
};

const DEFAULT_AUDIO_PREFERENCE = AUDIO_PREFERENCES.FRENCH;

const normalizeTitle = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
};

const getSubjectTypeValue = (type) => {
    return type === 'movie' ? 1 : type === 'series' ? 2 : null;
};

const getQueryCandidates = (baseTitle, preference) => {
    const candidates = [];
    const safeBaseTitle = typeof baseTitle === 'string' ? baseTitle.trim() : '';
    if (!safeBaseTitle) {
        return candidates;
    }
    if (preference === AUDIO_PREFERENCES.FRENCH) {
        candidates.push(
            `${safeBaseTitle} [version française]`,
            `${safeBaseTitle} version francaise`,
            `${safeBaseTitle} [vf]`,
            `${safeBaseTitle} french`,
            safeBaseTitle
        );
        return candidates;
    }
    candidates.push(
        `${safeBaseTitle} [english]`,
        `${safeBaseTitle} english`,
        `${safeBaseTitle} [netflix]`,
        safeBaseTitle
    );
    return candidates;
};

const scoreCandidate = (item, normalizedBaseTitle, preference) => {
    const title = typeof item?.title === 'string' ? item.title : '';
    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) {
        return -1000;
    }

    let score = 0;
    if (normalizedTitle === normalizedBaseTitle) {
        score += 120;
    } else if (normalizedTitle.includes(normalizedBaseTitle)) {
        score += 75;
    } else if (normalizedBaseTitle.includes(normalizedTitle)) {
        score += 45;
    }

    const rawLower = title.toLowerCase();
    const hasFrenchToken = /\b(vf|french|francais|française|version francaise|version française)\b/i.test(rawLower);
    const hasEnglishToken = /\b(english|vo|vost|netflix)\b/i.test(rawLower);

    if (preference === AUDIO_PREFERENCES.FRENCH) {
        score += hasFrenchToken ? 40 : -10;
        score += hasEnglishToken ? -20 : 0;
    } else {
        score += hasEnglishToken ? 25 : 0;
        score += hasFrenchToken ? -30 : 0;
    }

    return score;
};

const resolvePreferredSubjectId = async ({ subjectId, title, type, preference }) => {
    const safeSubjectId = typeof subjectId === 'string' ? subjectId : String(subjectId || '');
    const safePreference = preference === AUDIO_PREFERENCES.FRENCH ? AUDIO_PREFERENCES.FRENCH : AUDIO_PREFERENCES.ORIGINAL;
    const normalizedBaseTitle = normalizeTitle(title);
    const subjectType = getSubjectTypeValue(type);

    if (!safeSubjectId || !normalizedBaseTitle || subjectType === null) {
        return safeSubjectId;
    }

    const queries = getQueryCandidates(title, safePreference);
    for (const query of queries) {
        try {
            const response = await fetch(`${SEARCH_API_URL}/${encodeURIComponent(query)}`);
            if (!response.ok) {
                continue;
            }
            const payload = await response.json();
            const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
            const matchingType = items.filter((item) => item?.subjectType === subjectType);
            if (matchingType.length === 0) {
                continue;
            }

            const scored = matchingType
                .map((item) => ({ item, score: scoreCandidate(item, normalizedBaseTitle, safePreference) }))
                .sort((left, right) => right.score - left.score);

            const best = scored[0];
            if (best && best.score > 0 && best.item?.subjectId) {
                return String(best.item.subjectId);
            }
        } catch (_error) {
            // Ignore search errors and keep fallback subject id.
        }
    }

    return safeSubjectId;
};

const checkFrenchAvailable = async ({ subjectId, title, type }) => {
    const normalizedBaseTitle = normalizeTitle(title);
    const subjectType = getSubjectTypeValue(type);
    if (!normalizedBaseTitle || subjectType === null) {
        return { available: false, resolvedId: null };
    }

    const queries = getQueryCandidates(title, AUDIO_PREFERENCES.FRENCH);
    for (const query of queries) {
        try {
            const response = await fetch(`${SEARCH_API_URL}/${encodeURIComponent(query)}`);
            if (!response.ok) {
                continue;
            }
            const payload = await response.json();
            const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
            const matchingType = items.filter((item) => item?.subjectType === subjectType);
            if (matchingType.length === 0) {
                continue;
            }

            const scored = matchingType
                .map((item) => ({ item, score: scoreCandidate(item, normalizedBaseTitle, AUDIO_PREFERENCES.FRENCH) }))
                .sort((left, right) => right.score - left.score);

            const best = scored[0];
            if (best && best.score > 20 && best.item?.subjectId) {
                return { available: true, resolvedId: String(best.item.subjectId) };
            }
        } catch (_error) {
            // Ignore search errors.
        }
    }

    return { available: false, resolvedId: null };
};

module.exports = {
    AUDIO_PREFERENCES,
    DEFAULT_AUDIO_PREFERENCE,
    resolvePreferredSubjectId,
    checkFrenchAvailable
};
