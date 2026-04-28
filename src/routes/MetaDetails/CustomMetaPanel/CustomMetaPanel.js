// Copyright (C) 2017-2024 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useServices } = require('stremio/services');
const { Button } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const styles = require('./styles');

const SEARCH_API_URL = 'https://apii.freehandyflix.online/api/search';

const CustomMetaPanel = React.memo(({ className, meta, customInfo, streams, type, streamPath }) => {
    const { core } = useServices();
    const [trailerPlayerHref, setTrailerPlayerHref] = React.useState(null);
    const [similar, setSimilar] = React.useState([]);

    const trailerUrl = customInfo?.trailer?.videoAddress?.url || null;

    React.useEffect(() => {
        if (!trailerUrl) return;
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

    const playHref = React.useMemo(() => {
        if (!Array.isArray(streams)) return null;
        const readyGroup = streams.find((g) => g.content?.type === 'Ready');
        if (!readyGroup) return null;
        return readyGroup.content.content?.[0]?.deepLinks?.player || null;
    }, [streams]);

    const streamsLoading = React.useMemo(() => {
        return Array.isArray(streams) && streams.some((g) => g.content?.type === 'Loading');
    }, [streams]);

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
    const backdropUrl = customInfo?.stills?.url || meta?.background || '';
    const posterUrl = meta?.background || '';

    const genreStr = customInfo?.genre || '';
    React.useEffect(() => {
        if (!genreStr || !meta?.id) return;
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
                        .slice(0, 12)
                        .map((item) => ({
                            id: String(item.subjectId),
                            title: item.title,
                            poster: item.cover?.url || '',
                            type: item.subjectType === 1 ? 'movie' : 'series',
                            year: item.releaseDate?.split('-')[0] || '',
                        }))
                );
            } catch (_error) {
                // similar fetch failed, skip
            }
        };
        fetchSimilar();
        return () => { cancelled = true; };
    }, [genreStr, meta?.id]);

    const showPlayButton = streamPath !== null;

    const renderCastFallback = React.useCallback((name) => {
        const initials = name ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
        return (
            <div className={styles['cast-avatar-placeholder']}>
                <span className={styles['cast-initials']}>{initials}</span>
            </div>
        );
    }, []);

    return (
        <div className={classnames(className, styles['custom-meta-panel'])}>
            {backdropUrl ? (
                <div className={styles['backdrop-layer']} aria-hidden="true">
                    <img className={styles['backdrop-img']} src={backdropUrl} alt="" />
                    <div className={styles['backdrop-gradient']} />
                </div>
            ) : null}

            <div className={styles['scroll-area']}>
                <div className={styles['hero-section']}>
                    {posterUrl ? (
                        <div className={styles['poster-wrap']}>
                            <img className={styles['poster-img']} src={posterUrl} alt={meta?.name || ''} />
                        </div>
                    ) : null}

                    <div className={styles['info-col']}>
                        <h1 className={styles['title']}>{meta?.name}</h1>

                        <div className={styles['meta-row']}>
                            {imdbRating ? (
                                <span className={styles['imdb-badge']}>
                                    &#9733;&nbsp;{imdbRating}
                                </span>
                            ) : null}
                            {year ? <span className={styles['meta-pill']}>{year}</span> : null}
                            {meta?.runtime ? <span className={styles['meta-pill']}>{meta.runtime}</span> : null}
                            {type ? (
                                <span className={classnames(styles['meta-pill'], styles['type-pill'])}>
                                    {type === 'movie' ? 'Movie' : 'Series'}
                                </span>
                            ) : null}
                        </div>

                        {genres.length > 0 ? (
                            <div className={styles['genre-row']}>
                                {genres.map((g) => (
                                    <span key={g} className={styles['genre-tag']}>{g}</span>
                                ))}
                            </div>
                        ) : null}

                        {meta?.description ? (
                            <p className={styles['description']}>{meta.description}</p>
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
                                        <Icon className={styles['btn-icon']} name={'play'} />
                                        <span>Loading&hellip;</span>
                                    </div>
                                ) : null
                            ) : null}

                            {trailerPlayerHref ? (
                                <Button className={styles['trailer-btn']} href={trailerPlayerHref}>
                                    <Icon className={styles['btn-icon']} name={'play-outline'} />
                                    <span>Trailer</span>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {stars.length > 0 ? (
                    <div className={styles['section']}>
                        <div className={styles['section-title']}>Cast</div>
                        <div className={styles['cast-row']}>
                            {stars.slice(0, 14).map((star, i) => (
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
                    </div>
                ) : null}

                {similar.length > 0 ? (
                    <div className={styles['section']}>
                        <div className={styles['section-title']}>More Like This</div>
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
                                                <Icon className={styles['similar-placeholder-icon']} name={'ic_broken_link'} />
                                            </div>
                                        )}
                                        <div className={styles['similar-type-badge']}>
                                            {item.type === 'movie' ? 'Movie' : 'Series'}
                                        </div>
                                    </div>
                                    <div className={styles['similar-title']}>{item.title}</div>
                                    {item.year ? <div className={styles['similar-year']}>{item.year}</div> : null}
                                </Button>
                            ))}
                        </div>
                    </div>
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
};

module.exports = CustomMetaPanel;
