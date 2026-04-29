// Custom hook to fetch homepage data from external API with caching

const React = require('react');

const API_URL = 'https://apii.freehandyflix.online/api/homepage';
const CACHE_KEY = 'handyflix_homepage_cache_v1';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const getCache = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed.data;
    } catch (_e) {
        return null;
    }
};

const setCache = (data) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (_e) {
        // Ignore storage errors
    }
};

const useHomepageAPI = () => {
    const [sections, setSections] = React.useState(() => getCache() || []);
    const [loading, setLoading] = React.useState(() => !getCache());
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;

        const fetchHomepage = async () => {
            const cached = getCache();
            if (cached && cached.length > 0) {
                setSections(cached);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await fetch(API_URL);
                const text = await response.text();
                const data = JSON.parse(text);

                if (cancelled) return;

                if (data.status === 'success' && data.data) {
                    const operatingList = data.data.operatingList || [];
                    const contentSections = operatingList
                        .filter((section) => {
                            return (
                                section.type === 'SUBJECTS_MOVIE' ||
                                section.type === 'APPOINTMENT_LIST'
                            ) && Array.isArray(section.subjects) && section.subjects.length > 0;
                        })
                        .map((section) => ({
                            title: section.title,
                            type: section.type,
                            position: section.position,
                            items: section.subjects.map((subject) => ({
                                id: subject.subjectId,
                                title: subject.title,
                                poster: subject.cover?.url || '',
                                blurHash: subject.cover?.blurHash || '',
                                type: subject.subjectType === 1 ? 'movie' : 'series',
                                genre: subject.genre || '',
                                year: subject.releaseDate ? subject.releaseDate.split('-')[0] : '',
                                rating: subject.imdbRatingValue || '',
                                detailPath: subject.detailPath || '',
                                country: subject.countryName || '',
                            })),
                        }));

                    setSections(contentSections);
                    setCache(contentSections);
                } else {
                    setError('Failed to load homepage data');
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Homepage API error:', err);
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchHomepage();

        return () => {
            cancelled = true;
        };
    }, []);

    return { sections, loading, error };
};

module.exports = useHomepageAPI;
