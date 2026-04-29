// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const styles = require('./styles');

const MetaPreviewPlaceholder = ({ className }) => {
    return (
        <div className={classnames(className, styles['meta-preview-placeholder-container'])}>
            {/* Hero section skeleton */}
            <div className={styles['hero-skeleton']}>
                <div className={styles['hero-backdrop-skeleton']} />
                <div className={styles['hero-content-skeleton']}>
                    {/* Type chip skeleton */}
                    <div className={styles['chip-skeleton']} />
                    {/* Title skeleton */}
                    <div className={styles['title-skeleton']} />
                    <div className={styles['title-skeleton-short']} />
                    {/* Meta line skeleton */}
                    <div className={styles['meta-line-skeleton']}>
                        <div className={styles['meta-item-skeleton']} />
                        <div className={styles['meta-item-skeleton']} />
                        <div className={styles['meta-item-skeleton']} />
                        <div className={styles['meta-item-skeleton-rating']} />
                    </div>
                    {/* Actions skeleton */}
                    <div className={styles['actions-skeleton']}>
                        <div className={styles['btn-skeleton-primary']} />
                        <div className={styles['btn-skeleton-outline']} />
                        <div className={styles['btn-skeleton-outline-small']} />
                    </div>
                </div>
            </div>

            {/* Content section skeleton */}
            <div className={styles['content-skeleton']}>
                {/* Story skeleton */}
                <div className={styles['section-skeleton']}>
                    <div className={styles['section-title-skeleton']} />
                    <div className={styles['description-skeleton']}>
                        <div className={styles['text-line-skeleton']} />
                        <div className={styles['text-line-skeleton']} />
                        <div className={styles['text-line-skeleton-short']} />
                    </div>
                </div>

                {/* Cast skeleton */}
                <div className={styles['section-skeleton']}>
                    <div className={styles['section-title-skeleton']} />
                    <div className={styles['cast-rail-skeleton']}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={styles['cast-item-skeleton']}>
                                <div className={styles['cast-avatar-skeleton']} />
                                <div className={styles['cast-name-skeleton']} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Episodes skeleton */}
                <div className={styles['section-skeleton']}>
                    <div className={styles['section-header-skeleton']}>
                        <div className={styles['section-title-skeleton']} />
                        <div className={styles['dropdown-skeleton']} />
                    </div>
                    <div className={styles['episodes-rail-skeleton']}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={styles['episode-card-skeleton']} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading indicator */}
            <div className={styles['loading-indicator']}>
                <div className={styles['loading-spinner']}>
                    <div className={styles['spinner-ring']} />
                    <div className={styles['spinner-ring']} />
                </div>
                <span className={styles['loading-label']}>Loading...</span>
            </div>
        </div>
    );
};

MetaPreviewPlaceholder.propTypes = {
    className: PropTypes.string
};

module.exports = MetaPreviewPlaceholder;
