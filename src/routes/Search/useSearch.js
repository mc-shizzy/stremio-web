// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const useSearch = (queryParams) => {
    const [catalogs, setCatalogs] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const requestIdRef = React.useRef(0);
    const query = React.useMemo(() => {
        return queryParams.get('search') ?? queryParams.get('query') ?? '';
    }, [queryParams]);

    React.useEffect(() => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            setCatalogs([]);
            setLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setCatalogs([]);
        setLoading(true);

        const fetchSearchResults = async () => {
            try {
                const response = await fetch(`${SEARCH_API_URL}/${encodeURIComponent(normalizedQuery)}`);
                if (!response.ok) {
                    throw new Error(`Search API failed with status ${response.status}`);
                }

                const payload = await response.json();
                const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
                const mappedItems = items.map((item) => ({
                    id: item.subjectId,
                    type: item.subjectType === 1 ? 'movie' : 'series',
                    name: item.title,
                    poster: item.cover?.url || '',
                    posterShape: 'poster',
                    deepLinks: {
                        metaDetailsVideos: `#/metadetails/${item.subjectType === 1 ? 'movie' : 'series'}/${encodeURIComponent(String(item.subjectId))}`
                    }
                }));

                if (requestId === requestIdRef.current) {
                    setCatalogs([{
                        id: 'api-search-results',
                        type: 'other',
                        name: 'Search Results',
                        content: {
                            type: 'Ready',
                            content: mappedItems,
                        }
                    }]);
                    setLoading(false);
                }
            } catch (_error) {
                if (requestId === requestIdRef.current) {
                    setCatalogs([]);
                    setLoading(false);
                }
            }
        };

        fetchSearchResults();
    }, [query]);

    const loadRange = React.useCallback(() => {
        // No-op: external API returns the whole search set.
    }, []);

    const search = React.useMemo(() => ({
        selected: query.length > 0 ? { extra: [['search', query]] } : null,
        catalogs,
        loading,
    }), [query, catalogs, loading]);

    return [search, loadRange];
};

module.exports = useSearch;
