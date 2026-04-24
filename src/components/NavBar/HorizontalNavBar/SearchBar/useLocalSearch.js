// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const useLocalSearch = () => {
    const [items, setItems] = React.useState([]);
    const requestIdRef = React.useRef(0);

    const search = React.useCallback(async (query) => {
        const normalizedQuery = typeof query === 'string' ? query.trim() : '';
        if (!normalizedQuery) {
            setItems([]);
            return;
        }

        const requestId = ++requestIdRef.current;

        try {
            const response = await fetch(`${SEARCH_API_URL}/${encodeURIComponent(normalizedQuery)}`);
            if (!response.ok) {
                throw new Error(`Search API failed with status ${response.status}`);
            }

            const data = await response.json();
            const apiItems = Array.isArray(data?.data?.items) ? data.data.items : [];
            const mappedItems = apiItems
                .slice(0, 5)
                .map(({ title }) => ({
                    query: title,
                    deepLinks: {
                        search: `#/search?search=${encodeURIComponent(title)}`
                    }
                }))
                .filter((item) => item.query?.length > 0);

            if (requestId === requestIdRef.current) {
                setItems(mappedItems);
            }
        } catch (error) {
            if (requestId === requestIdRef.current) {
                setItems([]);
            }
        }
    }, []);

    return {
        items,
        search,
    };
};

module.exports = useLocalSearch;
