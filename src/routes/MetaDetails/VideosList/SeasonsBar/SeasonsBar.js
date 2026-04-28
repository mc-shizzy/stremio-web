// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { t } = require('i18next');
const { Button } = require('stremio/components');
const SeasonsBarPlaceholder = require('./SeasonsBarPlaceholder');
const styles = require('./styles');

const SeasonsBar = ({ className, seasons, season, onSelect }) => {
    const containerRef = React.useRef(null);
    const activeRef = React.useRef(null);

    const seasonOnClick = React.useCallback((event) => {
        if (typeof onSelect === 'function') {
            const value = Number(event.currentTarget.dataset.value);
            onSelect({
                type: 'select',
                value: value,
                reactEvent: event,
                nativeEvent: event.nativeEvent
            });
        }
    }, [onSelect]);

    React.useEffect(() => {
        if (activeRef.current && containerRef.current) {
            const container = containerRef.current;
            const node = activeRef.current;
            const nodeLeft = node.offsetLeft;
            const nodeRight = nodeLeft + node.offsetWidth;
            const viewLeft = container.scrollLeft;
            const viewRight = viewLeft + container.clientWidth;

            if (nodeLeft < viewLeft || nodeRight > viewRight) {
                container.scrollTo({
                    left: nodeLeft - (container.clientWidth - node.offsetWidth) / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [season]);

    return (
        <div className={classnames(className, styles['seasons-bar-container'])}>
            <div className={styles['seasons-track']} ref={containerRef}>
                {seasons.map((s) => {
                    const isActive = s === season;
                    const label = s > 0 ? t('SEASON_NUMBER', { season: s }) : t('SPECIAL');
                    return (
                        <Button
                            key={s}
                            ref={isActive ? activeRef : null}
                            data-value={s}
                            onClick={seasonOnClick}
                            title={label}
                            className={classnames(styles['season-pill'], { [styles['active']]: isActive })}
                        >
                            <span className={styles['pill-label']}>{label}</span>
                        </Button>
                    );
                })}
            </div>
            <div className={styles['fade-left']} aria-hidden={'true'} />
            <div className={styles['fade-right']} aria-hidden={'true'} />
        </div>
    );
};

SeasonsBar.Placeholder = SeasonsBarPlaceholder;

SeasonsBar.propTypes = {
    className: PropTypes.string,
    seasons: PropTypes.arrayOf(PropTypes.number).isRequired,
    season: PropTypes.number.isRequired,
    onSelect: PropTypes.func
};

module.exports = SeasonsBar;
