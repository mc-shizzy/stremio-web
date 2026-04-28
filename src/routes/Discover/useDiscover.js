// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const TRENDING_API_URL = 'https://apii.freehandyflix.online/api/trending';

const useDiscover = (urlParams, queryParams) => {
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
    const pageRef = React.useRef(1);
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
            posterShape: 'poster',
            runtime: item.duration ? `${item.duration} min` : '',
            releaseInfo: typeof item.releaseDate === 'string' ? item.releaseDate.split('-')[0] : '',
            released: new Date(typeof item.releaseDate === 'string' ? item.releaseDate : NaN),
            description: item.description || '',
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
        const rawItems = Array.isArray(payload?.data?.items) ? payload.data.items : (Array.isArray(payload?.data) ? payload.data : []);
        const pager = payload?.data?.pager || {};
        return {
            items: rawItems.map(mapTrendingItem),
            hasMore: Boolean(pager.hasMore)
        };
    }, [mapTrendingItem]);

    const loadNextPage = React.useCallback(async () => {
        if (loadingRef.current || !hasMoreRef.current) {
            return;
        }
        loadingRef.current = true;
        try {
            const { items, hasMore } = await fetchTrendingPage(pageRef.current);
            pageRef.current += 1;
            hasMoreRef.current = hasMore;
            setDiscover((prev) => {
                const prevItems = prev.catalog?.content?.type === 'Ready' ? prev.catalog.content.content : [];
                return {
                    ...prev,
                    selectable: {
                        ...prev.selectable,
                        nextPage: hasMore ? `page-${pageRef.current}` : null
                    },
                    catalog: {
                        installed: true,
                        content: {
                            type: 'Ready',
                            content: [...prevItems, ...items]
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
    }, [fetchTrendingPage]);

    React.useEffect(() => {
        pageRef.current = 1;
        hasMoreRef.current = true;
        setDiscover((prev) => ({
            ...prev,
            catalog: {
                installed: true,
                content: { type: 'Loading' }
            }
        }));
        loadNextPage();
    }, [loadNextPage, urlParams, queryParams]);

    return [discover, loadNextPage];
};

module.exports = useDiscover;
