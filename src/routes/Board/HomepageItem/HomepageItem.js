// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { decode } = require('blurhash');
const { default: Button } = require('stremio/components/Button');
const { default: Icon } = require('@stremio/stremio-icons/react');
const styles = require('./styles');

const BLURHASH_WIDTH = 32;
const BLURHASH_HEIGHT = 48;

const HomepageItem = React.memo(({ className, id, title, poster, blurHash, type, rating, year, genre, href: customHref }) => {
    const href = React.useMemo(() => {
        return typeof customHref === 'string' && customHref.length > 0 ?
            customHref
            :
            `#/metadetails/${type}/${encodeURIComponent(id)}`;
    }, [customHref, type, id]);
    const canvasRef = React.useRef(null);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);

    const renderPosterFallback = React.useCallback(() => (
        <Icon className={styles['placeholder-icon']} name={'movies'} />
    ), []);

    React.useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [poster]);

    React.useEffect(() => {
        if (!blurHash || imageLoaded || imageError || !canvasRef.current) {
            return;
        }

        try {
            const pixels = decode(blurHash, BLURHASH_WIDTH, BLURHASH_HEIGHT);
            const canvas = canvasRef.current;
            canvas.width = BLURHASH_WIDTH;
            canvas.height = BLURHASH_HEIGHT;
            const context = canvas.getContext('2d');
            const imageData = context.createImageData(BLURHASH_WIDTH, BLURHASH_HEIGHT);
            imageData.data.set(pixels);
            context.putImageData(imageData, 0, 0);
        } catch (_error) {
            // Invalid blurhash should not break rendering.
        }
    }, [blurHash, imageLoaded, imageError]);

    return (
        <Button className={classnames(className, styles['homepage-item-container'])} title={title} href={href}>
            <div className={styles['poster-container']}>
                <div className={styles['poster-image-layer']}>
                    {
                        blurHash && !imageLoaded && !imageError ?
                            <canvas
                                ref={canvasRef}
                                className={styles['blurhash-canvas']}
                                aria-hidden={'true'}
                            />
                            :
                            null
                    }
                    {
                        poster && !imageError ?
                            <img
                                className={classnames(styles['poster-image'], { [styles['loaded']]: imageLoaded })}
                                src={poster}
                                alt={title || ' '}
                                loading={'lazy'}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageError(true)}
                            />
                            :
                            renderPosterFallback()
                    }
                </div>
                {
                    rating ?
                        <div className={styles['rating-badge']}>
                            <Icon className={styles['rating-icon']} name={'star'} />
                            <span className={styles['rating-label']}>{rating}</span>
                        </div>
                        :
                        null
                }
            </div>
            <div className={styles['title-bar-container']}>
                <div className={styles['title-label']}>{title || ''}</div>
                {
                    year || genre ?
                        <div className={styles['meta-info']}>
                            {year ? <span className={styles['year']}>{year}</span> : null}
                            {year && genre ? <span className={styles['separator']}>•</span> : null}
                            {genre ? <span className={styles['genre']}>{genre.split(',')[0]}</span> : null}
                        </div>
                        :
                        null
                }
            </div>
        </Button>
    );
});

HomepageItem.displayName = 'HomepageItem';

HomepageItem.propTypes = {
    className: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string,
    poster: PropTypes.string,
    blurHash: PropTypes.string,
    type: PropTypes.string,
    rating: PropTypes.string,
    year: PropTypes.string,
    genre: PropTypes.string,
    detailPath: PropTypes.string,
    href: PropTypes.string,
};

module.exports = HomepageItem;
