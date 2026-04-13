// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const { withCoreSuspender } = require('stremio/common');
const { EventModal, MainNavBars } = require('stremio/components');
const useHomepageAPI = require('./useHomepageAPI');
const HomepageSection = require('./HomepageSection');
const SeeAll = require('./SeeAll');
const styles = require('./styles');

const Board = () => {
    const { sections, loading, error } = useHomepageAPI();
    const [seeAllIndex, setSeeAllIndex] = React.useState(null);

    // Listen for hash changes to handle #/board/section/:index
    React.useEffect(() => {
        const onHashChange = () => {
            const hash = window.location.hash;
            const match = hash.match(/^#\/board\/section\/(\d+)$/);
            if (match) {
                setSeeAllIndex(parseInt(match[1], 10));
            } else if (hash === '#/' || hash === '#/board' || hash === '' || hash === '#') {
                setSeeAllIndex(null);
            }
        };
        window.addEventListener('hashchange', onHashChange);
        onHashChange();
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // If viewing a "See All" section
    if (seeAllIndex !== null && sections[seeAllIndex]) {
        const section = sections[seeAllIndex];
        return (
            <SeeAll title={section.title} items={section.items} />
        );
    }

    return (
        <div className={styles['board-container']}>
            <EventModal />
            <MainNavBars className={styles['board-content-container']} route={'board'}>
                <div className={styles['board-content']}>
                    {
                        loading ?
                            <div className={styles['loader-container']}>
                                <div className={styles['loader-text']}>Loading...</div>
                            </div>
                            :
                            error ?
                                <div className={styles['error-container']}>
                                    <div className={styles['error-text']}>Failed to load content: {error}</div>
                                </div>
                                :
                                sections.map((section, index) => (
                                    <HomepageSection
                                        key={index}
                                        className={classnames(styles['board-row'], 'animation-fade-in')}
                                        title={section.title}
                                        items={section.items}
                                        sectionIndex={index}
                                    />
                                ))
                    }
                </div>
            </MainNavBars>
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'board'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
