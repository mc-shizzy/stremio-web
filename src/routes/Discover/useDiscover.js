// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const TRENDING_API_URL = 'https://apii.freehandyflix.online/api/trending';

const useDiscover = (urlParams, queryParams) => {
    const selectedTypeFilter = queryParams.get('type') || 'all';
    const selectedGenreFilter = queryParams.get('genre') || 'all';
    const buildDiscoverLink = React.useCallback((type, genre) => {
        const params = new URLSearchParams();
        if (type && type !== 'all') {
            params.set('type', type);
        }
        if (genre && genre !== 'all') {
            params.set('genre', genre);
        }
        const qs = params.toString();
        return qs.length > 0 ? `#/discover?${qs}` : '#/discover';
    }, []);
    const [discover, setDiscover] = React.useState({
        selected: null,
        selectable: {
            types: [],
            catalogs: [],
            extra: [],
            nextPage: null
        },
        catalog: {
            installed: true,
            content: {
                type: 'Loading'
            }
        }
    });
    const allItemsRef = React.useRef([]);
    const pageRef = React.useRef(0);
    const hasMoreRef = React.useRef(true);
    const loadingRef = React.useRef(false);

    const mapTrendingItem = React.useCallback((item) => {
        const type = item.subjectType === 1 ? 'movie' : 'series';
        const id = String(item.subjectId || '');
        return {
            id,
            type,
            name: item.title || '',
            logo: '',
            poster: item.cover?.url || '',
            blurHash: item.cover?.blurHash || '',
            posterShape: 'poster',
            runtime: item.duration ? `${item.duration} min` : '',
            releaseInfo: typeof item.releaseDate === 'string' ? item.releaseDate.split('-')[0] : '',
            released: new Date(typeof item.releaseDate === 'string' ? item.releaseDate : NaN),
            description: item.description || '',
            genre: item.genre || '',
            imdbRating: item.imdbRatingValue || '',
            links: [],
            trailerStreams: [],
            inLibrary: false,
            watched: false,
            deepLinks: {
                metaDetailsVideos: `#/metadetails/${type}/${encodeURIComponent(id)}`
            }
        };
    }, []);

    const fetchTrendingPage = React.useCallback(async (page) => {
        const response = await fetch(`${TRENDING_API_URL}?page=${page}`);
        if (!response.ok) {
            throw new Error(`Trending API failed with status ${response.status}`);
        }
        const payload = await response.json();
        const rawItems = Array.isArray(payload?.data?.subjectList) ?
            payload.data.subjectList
            :
            Array.isArray(payload?.data?.items) ?
                payload.data.items
                :
                Array.isArray(payload?.data) ?
                    payload.data
                    :
                    [];
        const pager = payload?.data?.pager || {};
        return {
            items: rawItems.map(mapTrendingItem),
            hasMore: Boolean(pager.hasMore)
        };
    }, [mapTrendingItem]);
    const applyFilters = React.useCallback((items) => {
        return items.filter((item) => {
            const typeMatch = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
            const genreMatch = selectedGenreFilter === 'all' || (typeof item.genre === 'string' && item.genre.toLowerCase().split(',').map((value) => value.trim()).includes(selectedGenreFilter.toLowerCase()));
            return typeMatch && genreMatch;
        });
    }, [selectedTypeFilter, selectedGenreFilter]);
    const buildSelectable = React.useCallback((items) => {
        const genreSet = new Set();
        items.forEach((item) => {
            if (typeof item.genre !== 'string' || item.genre.length === 0) {
                return;
            }
            item.genre.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => genreSet.add(part));
        });
        const genres = Array.from(genreSet).sort((left, right) => left.localeCompare(right));
        return {
            types: [
                { type: 'all', name: 'All', selected: selectedTypeFilter === 'all', deepLinks: { discover: buildDiscoverLink('all', selectedGenreFilter) } },
                { type: 'movie', selected: selectedTypeFilter === 'movie', deepLinks: { discover: buildDiscoverLink('movie', selectedGenreFilter) } },
                { type: 'series', selected: selectedTypeFilter === 'series', deepLinks: { discover: buildDiscoverLink('series', selectedGenreFilter) } }
            ],
            catalogs: [],
            extra: [{
                name: 'genre',
                isRequired: false,
                options: [
                    { value: 'All', selected: selectedGenreFilter === 'all', deepLinks: { discover: buildDiscoverLink(selectedTypeFilter, 'all') } },
                    ...genres.map((genre) => ({
                        value: genre,
                        selected: selectedGenreFilter.toLowerCase() === genre.toLowerCase(),
                        deepLinks: { discover: buildDiscoverLink(selectedTypeFilter, genre) }
                    }))
                ]
            }],
            nextPage: hasMoreRef.current ? `page-${pageRef.current}` : null
        };
    }, [selectedTypeFilter, selectedGenreFilter, buildDiscoverLink]);

    const loadNextPage = React.useCallback(async () => {
        if (loadingRef.current || !hasMoreRef.current) {
            return;
        }
        loadingRef.current = true;
        try {
            const { items, hasMore } = await fetchTrendingPage(pageRef.current);
            pageRef.current += 1;
            hasMoreRef.current = hasMore;
            allItemsRef.current = [...allItemsRef.current, ...items];
            const filteredItems = applyFilters(allItemsRef.current);
            setDiscover((prev) => {
                return {
                    ...prev,
                    selectable: buildSelectable(allItemsRef.current),
                    catalog: {
                        installed: true,
                        content: {
                            type: 'Ready',
                            content: filteredItems
                        }
                    }
                };
            });
        } catch (_error) {
            setDiscover((prev) => ({
                ...prev,
                catalog: {
                    installed: true,
                    content: {
                        type: 'Err',
                        content: 'Failed to load trending content'
                    }
                }
            }));
        } finally {
            loadingRef.current = false;
        }
    }, [fetchTrendingPage, applyFilters, buildSelectable]);

    React.useEffect(() => {
        pageRef.current = 0;
        hasMoreRef.current = true;
        allItemsRef.current = [];
        setDiscover((prev) => ({
            ...prev,
            selectable: buildSelectable([]),
            catalog: {
                installed: true,
                content: { type: 'Loading' }
            }
        }));
        loadNextPage();
    }, [loadNextPage, buildSelectable, urlParams, queryParams]);

    return [discover, loadNextPage];
};

module.exports = useDiscover;
