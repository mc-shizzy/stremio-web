// Custom hook to fetch homepage data from external API

const React = require('react');

const API_URL = 'https://apii.freehandyflix.online/api/homepage';

const useHomepageAPI = () => {
    const [sections, setSections] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;

        const fetchHomepage = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(API_URL);
                const text = await response.text();
                // Parse only the first JSON object (API may return trailing data)
                const data = JSON.parse(text);

                if (cancelled) return;

                if (data.status === 'success' && data.data) {
                    const operatingList = data.data.operatingList || [];
                    // Filter to only sections that have subjects (actual content)
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
