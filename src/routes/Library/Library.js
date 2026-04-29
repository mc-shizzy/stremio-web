// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const NotFound = require('stremio/routes/NotFound');
const { useProfile, useNotifications, routesRegexp, useOnScrollToBottom, withCoreSuspender } = require('stremio/common');
const { DelayedRenderer, Chips, Image, MainNavBars, LibItem, MultiselectMenu, Button } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Placeholder } = require('./Placeholder');
const useLibrary = require('./useLibrary');
const useSelectableInputs = require('./useSelectableInputs');
const { getContinueWatchingItems } = require('stremio/common/customContinueWatching');
const styles = require('./styles');

const SCROLL_TO_BOTTOM_TRESHOLD = 400;

const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
};

const ContinueWatchingCard = ({ item }) => {
    const episodeLabel = item.type === 'series' && item.season && item.episode
        ? `S${item.season} E${item.episode}`
        : null;

    return (
        <a href={item.href} className={styles['cw-card']}>
            <div className={styles['cw-poster-wrap']}>
                {item.poster ? (
                    <img className={styles['cw-poster']} src={item.poster} alt={item.title} loading="lazy" />
                ) : (
                    <div className={styles['cw-poster-placeholder']} />
                )}
                <div className={styles['cw-overlay']}>
                    <div className={styles['cw-play-btn']}>
                        <Icon name={'play'} />
                    </div>
                </div>
                <div className={styles['cw-progress-bar']}>
                    <div className={styles['cw-progress-fill']} style={{ width: `${item.progress}%` }} />
                </div>
            </div>
            <div className={styles['cw-info']}>
                <div className={styles['cw-title']}>{item.title}</div>
                <div className={styles['cw-meta']}>
                    {episodeLabel ? (
                        <span className={styles['cw-episode']}>{episodeLabel}</span>
                    ) : null}
                    <span className={styles['cw-time']}>{formatTime(item.time)} / {formatTime(item.duration)}</span>
                </div>
            </div>
        </a>
    );
};

ContinueWatchingCard.propTypes = {
    item: PropTypes.object.isRequired
};

function withModel(Library) {
    const withModel = ({ urlParams, queryParams }) => {
        const model = React.useMemo(() => {
            return typeof urlParams.path === 'string' ?
                urlParams.path.match(routesRegexp.library.regexp) ?
                    'library'
                    :
                    urlParams.path.match(routesRegexp.continuewatching.regexp) ?
                        'continue_watching'
                        :
                        null
                :
                null;
        }, [urlParams.path]);
        if (model === null) {
            return (
                <NotFound />
            );
        }

        return (
            <Library
                key={model}
                model={model}
                urlParams={urlParams}
                queryParams={queryParams}
            />
        );
    };
    withModel.displayName = 'withModel';
    return withModel;
}

const Library = ({ model, urlParams, queryParams }) => {
    const { t } = useTranslation();
    const profile = useProfile();
    const notifications = useNotifications();
    const [library, loadNextPage] = useLibrary(model, urlParams, queryParams);
    const [typeSelect, sortChips, hasNextPage] = useSelectableInputs(library);
    const scrollContainerRef = React.useRef(null);

    // Active tab: 'watchlist' or 'continue'
    const [activeTab, setActiveTab] = React.useState('watchlist');

    // Continue Watching items
    const [continueWatchingItems, setContinueWatchingItems] = React.useState([]);
    React.useEffect(() => {
        if (profile.auth !== null) {
            setContinueWatchingItems(getContinueWatchingItems());
        }
    }, [profile.auth, activeTab]);

    const onScrollToBottom = React.useCallback(() => {
        if (hasNextPage && activeTab === 'watchlist') {
            loadNextPage();
        }
    }, [hasNextPage, loadNextPage, activeTab]);
    const onScroll = useOnScrollToBottom(onScrollToBottom, SCROLL_TO_BOTTOM_TRESHOLD);

    React.useLayoutEffect(() => {
        if (scrollContainerRef.current !== null && library.selected && library.selected.request.page === 1 && library.catalog.length !== 0) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [profile.auth, library.selected]);

    React.useEffect(() => {
        if (!library.selected?.type && typeSelect.value) {
            window.location = typeSelect.value;
        }
    }, [typeSelect.value, library.selected]);

    const renderContent = () => {
        if (activeTab === 'continue') {
            if (continueWatchingItems.length === 0) {
                return (
                    <div className={styles['message-container']}>
                        <Icon className={styles['empty-icon']} name={'time'} />
                        <div className={styles['message-label']}>No items in progress</div>
                        <div className={styles['message-sub']}>Start watching something to see it here</div>
                    </div>
                );
            }
            return (
                <div className={classnames(styles['cw-grid'], 'animation-fade-in')}>
                    {continueWatchingItems.map((item, index) => (
                        <ContinueWatchingCard key={`${item.id}-${index}`} item={item} />
                    ))}
                </div>
            );
        }

        // Watchlist tab
        if (library.selected === null) {
            return (
                <DelayedRenderer delay={500}>
                    <div className={styles['message-container']}>
                        <Image
                            className={styles['image']}
                            src={require('/assets/images/empty.png')}
                            alt={' '}
                        />
                        <div className={styles['message-label']}>{t('LIBRARY_NOT_LOADED')}</div>
                    </div>
                </DelayedRenderer>
            );
        }
        if (library.catalog.length === 0) {
            return (
                <div className={styles['message-container']}>
                    <Icon className={styles['empty-icon']} name={'bookmark'} />
                    <div className={styles['message-label']}>Your watchlist is empty</div>
                    <div className={styles['message-sub']}>Add movies and series to watch later</div>
                </div>
            );
        }
        return (
            <div ref={scrollContainerRef} className={classnames(styles['meta-items-container'], 'animation-fade-in')} onScroll={onScroll}>
                {library.catalog.map((libItem, index) => (
                    <LibItem {...libItem} notifications={notifications} removable={true} key={index} />
                ))}
            </div>
        );
    };

    return (
        <MainNavBars className={styles['library-container']} route={model}>
            {profile.auth !== null ? (
                <div className={styles['library-content']}>
                    {/* Tab Filters */}
                    <div className={styles['library-tabs']}>
                        <button
                            type="button"
                            className={classnames(styles['library-tab'], { [styles['library-tab-active']]: activeTab === 'watchlist' })}
                            onClick={() => setActiveTab('watchlist')}
                        >
                            <Icon className={styles['tab-icon']} name={'bookmark'} />
                            <span>Watchlist</span>
                            {library.catalog?.length > 0 ? (
                                <span className={styles['tab-count']}>{library.catalog.length}</span>
                            ) : null}
                        </button>
                        <button
                            type="button"
                            className={classnames(styles['library-tab'], { [styles['library-tab-active']]: activeTab === 'continue' })}
                            onClick={() => setActiveTab('continue')}
                        >
                            <Icon className={styles['tab-icon']} name={'time'} />
                            <span>Continue Watching</span>
                            {continueWatchingItems.length > 0 ? (
                                <span className={styles['tab-count']}>{continueWatchingItems.length}</span>
                            ) : null}
                        </button>
                    </div>

                    {/* Filters for watchlist only */}
                    {activeTab === 'watchlist' ? (
                        <div className={styles['selectable-inputs-container']}>
                            <MultiselectMenu {...typeSelect} className={styles['select-input-container']} />
                            <Chips {...sortChips} className={styles['select-input-container']} />
                        </div>
                    ) : null}

                    {/* Content */}
                    {renderContent()}
                </div>
            ) : (
                <Placeholder />
            )}
        </MainNavBars>
    );
};

Library.propTypes = {
    model: PropTypes.oneOf(['library', 'continue_watching']),
    urlParams: PropTypes.shape({
        type: PropTypes.string
    }),
    queryParams: PropTypes.instanceOf(URLSearchParams)
};

const LibraryFallback = ({ model }) => (
    <MainNavBars className={styles['library-container']} route={model} />
);

LibraryFallback.propTypes = Library.propTypes;

module.exports = withModel(withCoreSuspender(Library, LibraryFallback));
