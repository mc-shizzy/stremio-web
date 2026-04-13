// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Button } = require('stremio/components/Button');
const { default: Image } = require('stremio/components/Image');
const { default: Icon } = require('@stremio/stremio-icons/react');
const styles = require('./styles');

const HomepageItem = React.memo(({ className, id, title, poster, type, rating, year, genre }) => {
    const href = React.useMemo(() => {
        return `#/metadetails/${type}/${encodeURIComponent(id)}`;
    }, [type, id]);

    const renderPosterFallback = React.useCallback(() => (
        <Icon className={styles['placeholder-icon']} name={'movies'} />
    ), []);

    return (
        <Button className={classnames(className, styles['homepage-item-container'])} title={title} href={href}>
            <div className={styles['poster-container']}>
                <div className={styles['poster-image-layer']}>
                    <Image
                        className={styles['poster-image']}
                        src={poster}
                        alt={title || ' '}
                        renderFallback={renderPosterFallback}
                    />
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
    type: PropTypes.string,
    rating: PropTypes.string,
    year: PropTypes.string,
    genre: PropTypes.string,
    detailPath: PropTypes.string,
};

module.exports = HomepageItem;
