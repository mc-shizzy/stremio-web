// Copyright (C) 2017-2024 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useServices } = require('stremio/services');
const { Button } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const styles = require('./styles');

const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const CustomMetaPanel = React.memo(({ className, meta, customInfo, streams, type, streamPath, libraryItem }) => {
    const { core } = useServices();
    const [trailerPlayerHref, setTrailerPlayerHref] = React.useState(null);
    const [similar, setSimilar] = React.useState([]);
    const [shareState, setShareState] = React.useState('idle'); // idle | copied
    const [synopsisOpen, setSynopsisOpen] = React.useState(false);
    const scrollAreaRef = React.useRef(null);
    const [scrollY, setScrollY] = React.useState(0);

    // -- trailer encode -----------------------------------------------------
    const trailerUrl = customInfo?.trailer?.videoAddress?.url || null;

    React.useEffect(() => {
        if (!trailerUrl) {
            setTrailerPlayerHref(null);
            return;
        }
        let cancelled = false;
        const encodeTrailer = async () => {
            try {
                const encoded = await core.transport.encodeStream({ url: trailerUrl });
                if (cancelled || typeof encoded !== 'string') return;
                setTrailerPlayerHref(`#/player/${encodeURIComponent(encoded)}`);
            } catch (_error) {
                // trailer encode failed, skip
            }
        };
        encodeTrailer();
        return () => { cancelled = true; };
    }, [core, trailerUrl]);

    // -- play/streams state -------------------------------------------------
    const playHref = React.useMemo(() => {
        if (!Array.isArray(streams)) return null;
        const readyGroup = streams.find((g) => g.content?.type === 'Ready');
        if (!readyGroup) return null;
        return readyGroup.content.content?.[0]?.deepLinks?.player || null;
    }, [streams]);

    const streamsLoading = React.useMemo(() => {
        return Array.isArray(streams) && streams.some((g) => g.content?.type === 'Loading');
    }, [streams]);

    // -- derived meta -------------------------------------------------------
    const genres = React.useMemo(() => {
        if (!customInfo?.genre) return [];
        return customInfo.genre.split(',').map((g) => g.trim()).filter(Boolean);
    }, [customInfo?.genre]);

    const year = React.useMemo(() => {
        if (meta?.released instanceof Date && !isNaN(meta.released.getTime())) {
            return meta.released.getFullYear();
        }
        return meta?.releaseInfo || '';
    }, [meta?.released, meta?.releaseInfo]);

    const stars = customInfo?.stars || [];
    const imdbRating = customInfo?.imdbRating;
    const ratingPct = typeof imdbRating === 'number' && isFinite(imdbRating)
        ? Math.max(0, Math.min(100, Math.round((imdbRating / 10) * 100)))
        : null;

    const backdropUrl = customInfo?.stills?.url || meta?.background || '';
    const posterUrl = meta?.poster || meta?.background || '';
    const logoUrl = typeof meta?.logo === 'string' && meta.logo.length > 0 ? meta.logo : null;

    const showPlayButton = streamPath !== null;
    const isSeries = type === 'series';
    const inLibrary = !!libraryItem && libraryItem.removed !== true;

    // -- similar fetch ------------------------------------------------------
    const genreStr = customInfo?.genre || '';
    React.useEffect(() => {
        if (!genreStr || !meta?.id) {
            setSimilar([]);
            return;
        }
        const firstGenre = genreStr.split(',')[0].trim();
        if (!firstGenre) return;
        let cancelled = false;
        const fetchSimilar = async () => {
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
            } catch (_error) {
                // similar fetch failed, skip
            }
        };
        fetchSimilar();
        return () => { cancelled = true; };
    }, [genreStr, meta?.id]);

    // -- library toggle (Stremio Core Ctx) ----------------------------------
    const toggleLibrary = React.useCallback(() => {
        if (!meta) return;
        try {
            if (inLibrary) {
                core.transport.dispatch({
                    action: 'Ctx',
                    args: { action: 'RemoveFromLibrary', args: meta.id }
                });
            } else {
                core.transport.dispatch({
                    action: 'Ctx',
                    args: { action: 'AddToLibrary', args: meta }
                });
            }
        } catch (_error) {
            // dispatch failed silently
        }
    }, [core, inLibrary, meta]);

    // -- share --------------------------------------------------------------
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
        } catch (_error) {
            // share canceled or failed
        }
    }, [meta?.name]);

    // -- scroll-driven backdrop parallax + sticky header --------------------
    React.useEffect(() => {
        const node = scrollAreaRef.current;
        if (!node) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                setScrollY(node.scrollTop);
                frame = 0;
            });
        };
        node.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            node.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    const backdropTransform = `translate3d(0, ${Math.min(scrollY * 0.3, 120)}px, 0) scale(${1 + Math.min(scrollY, 600) * 0.00015})`;
    const backdropOpacity = Math.max(0.18, 0.42 - scrollY / 1400);
    const stickyVisible = scrollY > 220;

    // -- helpers ------------------------------------------------------------
    const renderCastFallback = React.useCallback((name) => {
        const initials = name ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
        return (
            <div className={styles['cast-avatar-placeholder']}>
                <span className={styles['cast-initials']}>{initials}</span>
            </div>
        );
    }, []);

    const ratingRing = ratingPct !== null ? (
        <div
            className={styles['rating-ring']}
            style={{ '--rating-pct': `${ratingPct}%` }}
            aria-label={`Rating ${imdbRating} out of 10`}
            title={`IMDb ${imdbRating}/10`}
        >
            <div className={styles['rating-ring-inner']}>
                <span className={styles['rating-ring-value']}>{Number(imdbRating).toFixed(1)}</span>
            </div>
        </div>
    ) : null;

    return (
        <div className={classnames(className, styles['custom-meta-panel'])}>
            {backdropUrl ? (
                <div className={styles['backdrop-layer']} aria-hidden="true">
                    <div
                        className={styles['backdrop-img-wrap']}
                        style={{ transform: backdropTransform, opacity: backdropOpacity }}
                    >
                        <img className={styles['backdrop-img']} src={backdropUrl} alt="" />
                    </div>
                    <div className={styles['backdrop-vignette']} />
                    <div className={styles['backdrop-grain']} />
                </div>
            ) : (
                <div className={classnames(styles['backdrop-layer'], styles['backdrop-layer-solid'])} aria-hidden="true" />
            )}

            <div
                className={classnames(styles['sticky-header'], { [styles['sticky-header-visible']]: stickyVisible })}
                aria-hidden={!stickyVisible}
            >
                <div className={styles['sticky-title']} title={meta?.name || ''}>{meta?.name || ''}</div>
                {showPlayButton && playHref ? (
                    <Button className={styles['sticky-play-btn']} href={playHref}>
                        <Icon className={styles['btn-icon']} name={'play'} />
                        <span>Play</span>
                    </Button>
                ) : null}
            </div>

            <div ref={scrollAreaRef} className={styles['scroll-area']}>
                <section className={styles['hero-section']}>
                    {posterUrl ? (
                        <div className={styles['poster-wrap']}>
                            <img className={styles['poster-img']} src={posterUrl} alt={meta?.name || ''} />
                            <div className={styles['poster-shine']} aria-hidden="true" />
                        </div>
                    ) : null}

                    <div className={styles['info-col']}>
                        {logoUrl ? (
                            <div className={styles['logo-wrap']}>
                                <img className={styles['logo-img']} src={logoUrl} alt={meta?.name || ''} />
                            </div>
                        ) : (
                            <h1 className={styles['title']}>{meta?.name}</h1>
                        )}

                        <div className={styles['meta-row']}>
                            {ratingRing}
                            {imdbRating ? (
                                <span className={styles['imdb-badge']} title={`IMDb ${imdbRating}/10`}>
                                    <span className={styles['imdb-badge-mark']}>IMDb</span>
                                    <span className={styles['imdb-badge-value']}>{Number(imdbRating).toFixed(1)}</span>
                                </span>
                            ) : null}
                            {year ? <span className={styles['meta-pill']}>{year}</span> : null}
                            {meta?.runtime ? <span className={styles['meta-pill']}>{meta.runtime}</span> : null}
                            {type ? (
                                <span className={classnames(styles['meta-pill'], styles['type-pill'])}>
                                    {isSeries ? 'Series' : 'Movie'}
                                </span>
                            ) : null}
                            {meta?.country ? (
                                <span className={classnames(styles['meta-pill'], styles['country-pill'])}>
                                    {meta.country}
                                </span>
                            ) : null}
                        </div>

                        {genres.length > 0 ? (
                            <div className={styles['genre-row']}>
                                {genres.slice(0, 6).map((g) => (
                                    <span key={g} className={styles['genre-tag']}>{g}</span>
                                ))}
                            </div>
                        ) : null}

                        {meta?.description ? (
                            <div className={styles['synopsis-card']}>
                                <p
                                    className={classnames(styles['description'], {
                                        [styles['description-expanded']]: synopsisOpen
                                    })}
                                >
                                    {meta.description}
                                </p>
                                {meta.description.length > 240 ? (
                                    <button
                                        type="button"
                                        className={styles['synopsis-toggle']}
                                        onClick={() => setSynopsisOpen((v) => !v)}
                                    >
                                        {synopsisOpen ? 'Show less' : 'Read more'}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}

                        <div className={styles['action-row']}>
                            {showPlayButton ? (
                                playHref ? (
                                    <Button className={styles['play-btn']} href={playHref}>
                                        <Icon className={styles['btn-icon']} name={'play'} />
                                        <span>Watch Now</span>
                                    </Button>
                                ) : streamsLoading ? (
                                    <div className={classnames(styles['play-btn'], styles['play-btn-loading'])}>
                                        <span className={styles['spinner']} aria-hidden="true" />
                                        <span>Loading sources&hellip;</span>
                                    </div>
                                ) : (
                                    <div className={classnames(styles['play-btn'], styles['play-btn-disabled'])}>
                                        <Icon className={styles['btn-icon']} name={'play'} />
                                        <span>No source</span>
                                    </div>
                                )
                            ) : null}

                            {trailerPlayerHref ? (
                                <Button className={styles['ghost-btn']} href={trailerPlayerHref}>
                                    <Icon className={styles['btn-icon']} name={'trailer'} />
                                    <span>Trailer</span>
                                </Button>
                            ) : null}

                            {libraryItem !== undefined ? (
                                <Button
                                    className={classnames(styles['icon-btn'], { [styles['icon-btn-active']]: inLibrary })}
                                    onClick={toggleLibrary}
                                    title={inLibrary ? 'Remove from My List' : 'Add to My List'}
                                >
                                    <Icon className={styles['btn-icon']} name={inLibrary ? 'checkmark' : 'add'} />
                                    <span>{inLibrary ? 'In List' : 'My List'}</span>
                                </Button>
                            ) : null}

                            <Button
                                className={classnames(styles['icon-btn'], { [styles['icon-btn-success']]: shareState === 'copied' })}
                                onClick={handleShare}
                                title="Share"
                            >
                                <Icon className={styles['btn-icon']} name={shareState === 'copied' ? 'checkmark' : 'share'} />
                                <span>{shareState === 'copied' ? 'Copied' : 'Share'}</span>
                            </Button>
                        </div>
                    </div>
                </section>

                {stars.length > 0 ? (
                    <section className={styles['section']}>
                        <header className={styles['section-header']}>
                            <h2 className={styles['section-title']}>Cast</h2>
                            <span className={styles['section-count']}>{stars.length}</span>
                        </header>
                        <div className={styles['cast-row']}>
                            {stars.slice(0, 18).map((star, i) => (
                                <div key={`${star.staffId || i}`} className={styles['cast-card']}>
                                    <div className={styles['cast-avatar-wrap']}>
                                        {star.avatarUrl ? (
                                            <img
                                                className={styles['cast-avatar']}
                                                src={star.avatarUrl}
                                                alt={star.name}
                                                loading="lazy"
                                            />
                                        ) : renderCastFallback(star.name)}
                                    </div>
                                    <div className={styles['cast-name']} title={star.name}>{star.name}</div>
                                    {star.character ? (
                                        <div className={styles['cast-char']} title={star.character}>{star.character}</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {similar.length > 0 ? (
                    <section className={styles['section']}>
                        <header className={styles['section-header']}>
                            <h2 className={styles['section-title']}>More Like This</h2>
                        </header>
                        <div className={styles['similar-row']}>
                            {similar.map((item) => (
                                <Button
                                    key={item.id}
                                    className={styles['similar-card']}
                                    href={`#/metadetails/${item.type}/${encodeURIComponent(item.id)}`}
                                    title={item.title}
                                >
                                    <div className={styles['similar-poster-wrap']}>
                                        {item.poster ? (
                                            <img
                                                className={styles['similar-poster']}
                                                src={item.poster}
                                                alt={item.title}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className={styles['similar-poster-placeholder']}>
                                                <Icon className={styles['similar-placeholder-icon']} name={'movies'} />
                                            </div>
                                        )}
                                        <div className={styles['similar-overlay']}>
                                            <div className={styles['similar-play']}>
                                                <Icon className={styles['similar-play-icon']} name={'play'} />
                                            </div>
                                        </div>
                                        <div className={styles['similar-type-badge']}>
                                            {item.type === 'movie' ? 'Movie' : 'Series'}
                                        </div>
                                        {item.rating ? (
                                            <div className={styles['similar-rating']}>
                                                <Icon className={styles['similar-rating-icon']} name={'star'} />
                                                <span>{Number(item.rating).toFixed(1)}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className={styles['similar-title']}>{item.title}</div>
                                    {item.year ? <div className={styles['similar-year']}>{item.year}</div> : null}
                                </Button>
                            ))}
                        </div>
                    </section>
                ) : null}

                <div className={styles['bottom-spacer']} />
            </div>
        </div>
    );
});

CustomMetaPanel.displayName = 'CustomMetaPanel';

CustomMetaPanel.propTypes = {
    className: PropTypes.string,
    meta: PropTypes.object,
    customInfo: PropTypes.shape({
        stars: PropTypes.array,
        stills: PropTypes.object,
        trailer: PropTypes.object,
        genre: PropTypes.string,
        imdbRating: PropTypes.number,
    }),
    streams: PropTypes.array,
    type: PropTypes.string,
    streamPath: PropTypes.object,
    libraryItem: PropTypes.object,
};

module.exports = CustomMetaPanel;
