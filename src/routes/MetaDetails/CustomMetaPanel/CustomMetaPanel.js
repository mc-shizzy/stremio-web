// Copyright (C) 2017-2024 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useServices } = require('stremio/services');
const { Button } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { getResumeTime } = require('stremio/common/customContinueWatching');
const styles = require('./styles');

const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const CustomMetaPanel = React.memo(({ className, meta, customInfo, streams, type, streamPath, libraryItem }) => {
    const { core } = useServices();
    const isSeries = type === 'series';

    // ---- derived meta -----------------------------------------------------
    const genres = React.useMemo(() => {
        if (!customInfo?.genre) return [];
        return customInfo.genre.split(',').map((g) => g.trim()).filter(Boolean);
    }, [customInfo?.genre]);

    const stars = customInfo?.stars || [];
    const imdbRating = customInfo?.imdbRating;
    const trailerUrl = customInfo?.trailer?.videoAddress?.url || null;

    const year = React.useMemo(() => {
        if (meta?.released instanceof Date && !isNaN(meta.released.getTime())) {
            return meta.released.getFullYear();
        }
        return meta?.releaseInfo || '';
    }, [meta?.released, meta?.releaseInfo]);

    const backdropUrl = customInfo?.stills?.url || meta?.background || '';
    const totalEpisodes = isSeries
        ? (Array.isArray(meta?.videos) ? meta.videos.filter((v) => v.season > 0).length : 0)
        : 0;

    // ---- seasons & episodes ----------------------------------------------
    const allSeasons = React.useMemo(() => {
        if (!Array.isArray(meta?.videos)) return [];
        const set = new Set(
            meta.videos
                .map((v) => v.season)
                .filter((s) => typeof s === 'number' && s > 0)
        );
        return Array.from(set).sort((a, b) => a - b);
    }, [meta?.videos]);

    const [activeSeason, setActiveSeason] = React.useState(null);
    React.useEffect(() => {
        if (isSeries && allSeasons.length > 0 && (activeSeason === null || !allSeasons.includes(activeSeason))) {
            setActiveSeason(allSeasons[0]);
        }
    }, [allSeasons, activeSeason, isSeries]);

    const seasonEpisodes = React.useMemo(() => {
        if (!Array.isArray(meta?.videos) || activeSeason === null) return [];
        return meta.videos
            .filter((v) => v.season === activeSeason)
            .sort((a, b) => (a.episode || 0) - (b.episode || 0));
    }, [meta?.videos, activeSeason]);

    // ---- play state -------------------------------------------------------
    const playHref = React.useMemo(() => {
        if (!Array.isArray(streams)) return null;
        const ready = streams.find((g) => g.content?.type === 'Ready');
        if (!ready) return null;
        return ready.content.content?.[0]?.deepLinks?.player || null;
    }, [streams]);

    const streamsLoading = React.useMemo(() => {
        return Array.isArray(streams) && streams.some((g) => g.content?.type === 'Loading');
    }, [streams]);

    const heroPlayHref = React.useMemo(() => {
        if (playHref) return playHref;
        if (isSeries && seasonEpisodes.length > 0) {
            // resume episode: latest with progress, else first
            const withProgress = seasonEpisodes
                .map((ep) => ({
                    ep,
                    resume: getResumeTime({
                        subjectId: meta?.id,
                        type: 'series',
                        season: ep.season,
                        episode: ep.episode
                    })
                }))
                .filter((x) => x.resume > 0)
                .sort((a, b) => b.resume - a.resume);
            const target = withProgress[0]?.ep || seasonEpisodes[0];
            return target?.deepLinks?.metaDetailsStreams || null;
        }
        return null;
    }, [playHref, isSeries, seasonEpisodes, meta?.id]);

    const heroResumeTime = React.useMemo(() => {
        if (!meta?.id) return 0;
        if (!isSeries) {
            return getResumeTime({ subjectId: meta.id, type: 'movie' });
        }
        if (streamPath?.id) {
            const parts = streamPath.id.split(':');
            const season = parseInt(parts[1], 10);
            const episode = parseInt(parts[2], 10);
            if (!isNaN(season) && !isNaN(episode)) {
                return getResumeTime({ subjectId: meta.id, type: 'series', season, episode });
            }
        }
        // any episode resume?
        if (Array.isArray(meta?.videos)) {
            for (const v of meta.videos) {
                const t = getResumeTime({
                    subjectId: meta.id,
                    type: 'series',
                    season: v.season,
                    episode: v.episode
                });
                if (t > 0) return t;
            }
        }
        return 0;
    }, [meta?.id, meta?.videos, isSeries, streamPath?.id]);

    const heroLabel = heroResumeTime > 0 ? 'Continue Watching' : 'Watch Now';

    // ---- library / share / like ------------------------------------------
    const inLibrary = !!libraryItem && libraryItem.removed !== true;
    const [liked, setLiked] = React.useState(false);
    const [shareState, setShareState] = React.useState('idle');

    React.useEffect(() => {
        if (!meta?.id || typeof localStorage === 'undefined') return;
        try {
            const likes = JSON.parse(localStorage.getItem('saintstream_likes') || '{}');
            setLiked(!!likes[meta.id]);
        } catch (_e) {
            // ignore
        }
    }, [meta?.id]);

    const toggleLike = React.useCallback(() => {
        if (!meta?.id || typeof localStorage === 'undefined') return;
        try {
            const likes = JSON.parse(localStorage.getItem('saintstream_likes') || '{}');
            if (likes[meta.id]) delete likes[meta.id];
            else likes[meta.id] = Date.now();
            localStorage.setItem('saintstream_likes', JSON.stringify(likes));
            setLiked(!!likes[meta.id]);
        } catch (_e) {
            // ignore
        }
    }, [meta?.id]);

    const toggleLibrary = React.useCallback(() => {
        if (!meta) return;
        try {
            core.transport.dispatch({
                action: 'Ctx',
                args: inLibrary
                    ? { action: 'RemoveFromLibrary', args: meta.id }
                    : { action: 'AddToLibrary', args: meta }
            });
        } catch (_e) {
            // ignore
        }
    }, [core, inLibrary, meta]);

    const handleShare = React.useCallback(async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = meta?.name || 'Watch on HandyFlix';
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({ title, url });
                return;
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                setShareState('copied');
                setTimeout(() => setShareState('idle'), 1800);
            }
        } catch (_e) {
            // ignore
        }
    }, [meta?.name]);

    // ---- trailer ----------------------------------------------------------
    const [trailerHref, setTrailerHref] = React.useState(null);
    React.useEffect(() => {
        if (!trailerUrl) {
            setTrailerHref(null);
            return;
        }
        let cancelled = false;
        core.transport.encodeStream({ url: trailerUrl })
            .then((enc) => {
                if (cancelled || typeof enc !== 'string') return;
                setTrailerHref(`#/player/${encodeURIComponent(enc)}`);
            })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [core, trailerUrl]);

    // ---- download --------------------------------------------------------
    const downloadUrl = React.useMemo(() => {
        if (!Array.isArray(streams)) return null;
        const ready = streams.find((g) => g.content?.type === 'Ready');
        if (!ready) return null;
        const first = ready.content.content?.[0];
        return first?.deepLinks?.externalPlayer?.download || null;
    }, [streams]);

    // ---- similar fetch ---------------------------------------------------
    const [similar, setSimilar] = React.useState([]);
    const genreStr = customInfo?.genre || '';
    React.useEffect(() => {
        if (!genreStr || !meta?.id) {
            setSimilar([]);
            return;
        }
        const firstGenre = genreStr.split(',')[0].trim();
        if (!firstGenre) return;
        let cancelled = false;
        const run = async () => {
            try {
                const r = await fetch(`${SEARCH_API_URL}/${encodeURIComponent(firstGenre)}`);
                const data = await r.json();
                if (cancelled) return;
                const items = data.data?.items || [];
                setSimilar(
                    items
                        .filter((item) => String(item.subjectId) !== String(meta.id))
                        .slice(0, 14)
                        .map((item) => ({
                            id: String(item.subjectId),
                            title: item.title,
                            poster: item.cover?.url || '',
                            type: item.subjectType === 1 ? 'movie' : 'series',
                            year: item.releaseDate?.split('-')[0] || '',
                            rating: item.imdbRatingValue || null,
                        }))
                );
            } catch (_e) {
                // ignore
            }
        };
        run();
        return () => { cancelled = true; };
    }, [genreStr, meta?.id]);

    // ---- description -----------------------------------------------------
    const [synopsisOpen, setSynopsisOpen] = React.useState(false);
    const showDescriptionToggle = (meta?.description?.length || 0) > 280;

    // ---- cosmetic tabs ---------------------------------------------------
    const [activeTab, setActiveTab] = React.useState('episode');
    const showTabs = isSeries;

    // ---- season dropdown -------------------------------------------------
    const [seasonOpen, setSeasonOpen] = React.useState(false);
    const seasonDropdownRef = React.useRef(null);
    React.useEffect(() => {
        if (!seasonOpen) return undefined;
        const onDocClick = (e) => {
            if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(e.target)) {
                setSeasonOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [seasonOpen]);

    // ---- horizontal rail scroll helpers ----------------------------------
    const castRailRef = React.useRef(null);
    const episodeRailRef = React.useRef(null);
    const similarRailRef = React.useRef(null);

    const scrollRail = (ref, dir) => {
        const node = ref.current;
        if (!node) return;
        const amount = Math.max(node.clientWidth * 0.8, 320) * (dir === 'next' ? 1 : -1);
        node.scrollBy({ left: amount, behavior: 'smooth' });
    };

    // ---- render ----------------------------------------------------------
    return (
        <div className={classnames(className, styles['custom-meta-panel'])}>
            {/* HERO */}
            <section className={styles['hero']}>
                <div className={styles['hero-backdrop']} aria-hidden="true">
                    {backdropUrl ? <img className={styles['hero-backdrop-img']} src={backdropUrl} alt="" /> : null}
                    <div className={styles['hero-vignette']} />
                    <div className={styles['hero-fade-bottom']} />
                    <div className={styles['hero-fade-left']} />
                </div>

                <div className={styles['hero-content']}>
                    <div className={styles['type-chip']}>{isSeries ? 'Series' : 'Movie'}</div>

                    <h1 className={styles['hero-title']}>{meta?.name}</h1>

                    <div className={styles['hero-meta-line']}>
                        {isSeries && totalEpisodes > 0 ? (
                            <span>{totalEpisodes} Episodes</span>
                        ) : null}
                        {!isSeries && meta?.runtime ? <span>{meta.runtime}</span> : null}
                        {year ? <span>{year}</span> : null}
                        {genres.slice(0, 3).map((g) => (
                            <span key={g}>{g}</span>
                        ))}
                        {imdbRating ? (
                            <span className={styles['hero-rating']}>
                                <Icon className={styles['hero-rating-icon']} name={'star'} />
                                {Number(imdbRating).toFixed(1)}
                            </span>
                        ) : null}
                    </div>

                    <div className={styles['hero-actions']}>
                        <div className={styles['actions-primary']}>
                            {heroPlayHref ? (
                                <Button className={styles['btn-primary']} href={heroPlayHref}>
                                    <Icon className={styles['btn-icon']} name={'play'} />
                                    <span>{heroLabel}</span>
                                </Button>
                            ) : streamsLoading ? (
                                <div className={classnames(styles['btn-primary'], styles['btn-loading'])}>
                                    <span className={styles['spinner']} aria-hidden="true" />
                                    <span>Loading{'\u2026'}</span>
                                </div>
                            ) : (
                                <div className={classnames(styles['btn-primary'], styles['btn-disabled'])}>
                                    <Icon className={styles['btn-icon']} name={'play'} />
                                    <span>No source</span>
                                </div>
                            )}

                            {libraryItem !== undefined ? (
                                <Button
                                    className={classnames(styles['btn-outline'], { [styles['btn-active']]: inLibrary })}
                                    onClick={toggleLibrary}
                                    title={inLibrary ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                >
                                    <Icon className={styles['btn-icon']} name={inLibrary ? 'checkmark' : 'add'} />
                                    <span>{inLibrary ? 'In Watchlist' : 'Add Watchlist'}</span>
                                </Button>
                            ) : null}
                        </div>

                        <div className={styles['actions-secondary']}>
                            {downloadUrl ? (
                                <Button
                                    className={styles['btn-outline']}
                                    href={downloadUrl}
                                    target={'_blank'}
                                    rel={'noopener noreferrer'}
                                    title={'Download'}
                                >
                                    <Icon className={styles['btn-icon']} name={'download'} />
                                    <span>Download</span>
                                </Button>
                            ) : null}
                            <Button
                                className={classnames(styles['btn-outline'], { [styles['btn-success']]: shareState === 'copied' })}
                                onClick={handleShare}
                                title={'Share'}
                            >
                                <Icon className={styles['btn-icon']} name={shareState === 'copied' ? 'checkmark' : 'share'} />
                                <span>{shareState === 'copied' ? 'Copied' : 'Share'}</span>
                            </Button>
                            <Button
                                className={classnames(styles['btn-outline'], { [styles['btn-active']]: liked })}
                                onClick={toggleLike}
                                title={liked ? 'Unlike' : 'Like'}
                            >
                                <Icon className={styles['btn-icon']} name={'thumbs-up'} />
                                <span>{liked ? 'Liked' : 'Like'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTENT */}
            <div className={styles['content']}>
                {/* Story Line */}
                {meta?.description ? (
                    <section className={styles['section']}>
                        <h2 className={styles['section-title']}>Story Line</h2>
                        <p className={classnames(styles['description'], { [styles['description-expanded']]: synopsisOpen })}>
                            {meta.description}
                            {showDescriptionToggle && !synopsisOpen ? (
                                <span className={styles['description-fade']} aria-hidden="true" />
                            ) : null}
                        </p>
                        {showDescriptionToggle ? (
                            <button
                                type="button"
                                className={styles['more-toggle']}
                                onClick={() => setSynopsisOpen((v) => !v)}
                            >
                                {synopsisOpen ? 'Less' : 'More'}
                            </button>
                        ) : null}
                    </section>
                ) : null}

                {/* Top Cast */}
                {stars.length > 0 ? (
                    <section className={styles['section']}>
                        <h2 className={styles['section-title']}>Top Cast</h2>
                        <div className={styles['rail-wrap']}>
                            <div className={styles['rail']} ref={castRailRef}>
                                {stars.slice(0, 18).map((s, i) => (
                                    <div key={s.staffId || i} className={styles['cast-item']}>
                                        <div className={styles['cast-avatar-wrap']}>
                                            {s.avatarUrl ? (
                                                <img className={styles['cast-avatar']} src={s.avatarUrl} alt={s.name} loading="lazy" />
                                            ) : (
                                                <div className={styles['cast-avatar-fallback']}>
                                                    <span>
                                                        {(s.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles['cast-name']} title={s.name}>{s.name}</div>
                                        {s.character ? (
                                            <div className={styles['cast-char']} title={s.character}>{s.character}</div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className={classnames(styles['rail-arrow'], styles['rail-arrow-right'])}
                                onClick={() => scrollRail(castRailRef, 'next')}
                                aria-label="Scroll cast right"
                            >
                                <Icon name={'caret-right'} />
                            </button>
                        </div>
                    </section>
                ) : null}

                {/* Tabs (cosmetic) + Episodes */}
                {showTabs ? (
                    <section className={styles['section']}>
                        <div className={styles['tabs']}>
                            {[
                                { id: 'episode', label: 'Episode' },
                                { id: 'universe', label: 'Universe' },
                                { id: 'news', label: 'News' },
                                { id: 'reviews', label: 'Reviews' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={classnames(styles['tab'], { [styles['tab-active']]: activeTab === tab.id })}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {activeTab === 'episode' ? (
                            <div className={styles['episode-panel']}>
                                <div className={styles['episode-panel-header']}>
                                    <h3 className={styles['episode-panel-title']}>
                                        {seasonEpisodes.length > 0
                                            ? `1-${seasonEpisodes.length} Episode`
                                            : 'Episodes'}
                                    </h3>
                                    {allSeasons.length > 1 ? (
                                        <div className={styles['season-dropdown']} ref={seasonDropdownRef}>
                                            <button
                                                type="button"
                                                className={classnames(styles['season-trigger'], { [styles['season-trigger-open']]: seasonOpen })}
                                                onClick={() => {
                                                    console.log('[v0] Season dropdown clicked, current seasonOpen:', seasonOpen, ', allSeasons:', allSeasons);
                                                    setSeasonOpen((v) => !v);
                                                }}
                                            >
                                                <span>Season {activeSeason}</span>
                                                <Icon className={styles['season-caret']} name={'caret-down'} />
                                            </button>
                                            {seasonOpen ? (
                                                <div className={styles['season-menu']} role="listbox" style={{ border: '2px solid red' }}>
                                                    {console.log('[v0] Rendering season menu with seasons:', allSeasons)}
                                                    {allSeasons.map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            className={classnames(styles['season-option'], { [styles['season-option-active']]: s === activeSeason })}
                                                            onClick={() => { setActiveSeason(s); setSeasonOpen(false); }}
                                                        >
                                                            Season {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>

                                <div className={styles['rail-wrap']}>
                                    <div className={styles['episodes-rail']} ref={episodeRailRef}>
                                        {seasonEpisodes.map((ep) => {
                                            const resumeTime = getResumeTime({
                                                subjectId: meta?.id,
                                                type: 'series',
                                                season: ep.season,
                                                episode: ep.episode
                                            });
                                            const epNum = String(ep.episode || 0).padStart(2, '0');
                                            const isCurrent = streamPath?.id === ep.id;
                                            const progressPct = resumeTime > 0
                                                ? Math.min(100, Math.max(2, (resumeTime / 3600) * 100))
                                                : 0;
                                            return (
                                                <a
                                                    key={ep.id}
                                                    className={classnames(styles['ep-card'], { [styles['ep-card-current']]: isCurrent })}
                                                    href={ep.deepLinks?.metaDetailsStreams || '#'}
                                                    title={ep.title || `Episode ${ep.episode}`}
                                                >
                                                    <div className={styles['ep-card-bg']} aria-hidden="true">
                                                        {backdropUrl ? <img src={backdropUrl} alt="" /> : null}
                                                    </div>
                                                    <div className={styles['ep-card-overlay']} aria-hidden="true" />
                                                    <span className={styles['ep-card-watermark']}>{epNum}</span>
                                                    <div className={styles['ep-card-body']}>
                                                        <div className={styles['ep-card-tag']}>S{ep.season} {'\u2022'} Episode {ep.episode}</div>
                                                        <div className={styles['ep-card-title']}>
                                                            {ep.title || `Episode ${ep.episode}`}
                                                        </div>
                                                    </div>
                                                    <div className={styles['ep-card-play']} aria-hidden="true">
                                                        <Icon name={'play'} />
                                                    </div>
                                                    {resumeTime > 0 ? (
                                                        <div className={styles['ep-card-progress']}>
                                                            <span className={styles['ep-card-progress-current']}>{formatTime(resumeTime)}</span>
                                                            <div className={styles['ep-card-progress-bar']}>
                                                                <div
                                                                    className={styles['ep-card-progress-fill']}
                                                                    style={{ width: `${progressPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </a>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        className={classnames(styles['rail-arrow'], styles['rail-arrow-right'])}
                                        onClick={() => scrollRail(episodeRailRef, 'next')}
                                        aria-label="Scroll episodes right"
                                    >
                                        <Icon name={'caret-right'} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles['tab-empty']}>
                                <p>
                                    {activeTab === 'universe'
                                        ? 'Universe content is coming soon.'
                                        : activeTab === 'news'
                                            ? 'No news yet.'
                                            : 'No reviews yet.'}
                                </p>
                            </div>
                        )}
                    </section>
                ) : null}

                {/* Similar Movies */}
                {similar.length > 0 ? (
                    <section className={classnames(styles['section'], styles['section-similar'])}>
                        <h2 className={styles['section-title']}>Similar Movies for you</h2>
                        <div className={styles['rail-wrap']}>
                            <div className={styles['similar-rail']} ref={similarRailRef}>
                                {similar.map((item) => (
                                    <a
                                        key={item.id}
                                        className={styles['similar-card']}
                                        href={`#/metadetails/${item.type}/${encodeURIComponent(item.id)}`}
                                        title={item.title}
                                    >
                                        <div className={styles['similar-poster']}>
                                            {item.poster ? (
                                                <img src={item.poster} alt={item.title} loading="lazy" />
                                            ) : (
                                                <div className={styles['similar-poster-placeholder']} />
                                            )}
                                            <div className={styles['similar-overlay']} aria-hidden="true">
                                                <div className={styles['similar-play']}>
                                                    <Icon name={'play'} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles['similar-title']}>{item.title}</div>
                                        <div className={styles['similar-meta']}>
                                            {item.rating ? (
                                                <>
                                                    <span className={styles['similar-rating']}>
                                                        <Icon className={styles['similar-rating-star']} name={'star'} />
                                                        {Number(item.rating).toFixed(1)}
                                                    </span>
                                                    <span className={styles['similar-sep']}>{'|'}</span>
                                                </>
                                            ) : null}
                                            <span>{item.type === 'series' ? 'Series' : 'Movie'}</span>
                                            {item.year ? (
                                                <>
                                                    <span className={styles['similar-sep']}>{'\u2022'}</span>
                                                    <span>{item.year}</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </a>
                                ))}
                            </div>
                            <button
                                type="button"
                                className={classnames(styles['rail-arrow'], styles['rail-arrow-right'])}
                                onClick={() => scrollRail(similarRailRef, 'next')}
                                aria-label="Scroll similar right"
                            >
                                <Icon name={'caret-right'} />
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
});

CustomMetaPanel.displayName = 'CustomMetaPanel';

CustomMetaPanel.propTypes = {
    className: PropTypes.string,
    meta: PropTypes.object,
    customInfo: PropTypes.object,
    streams: PropTypes.array,
    type: PropTypes.string,
    streamPath: PropTypes.object,
    libraryItem: PropTypes.object
};

module.exports = CustomMetaPanel;
