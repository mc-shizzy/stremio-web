// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('stremio/components');
const HomepageItem = require('../HomepageItem');
const styles = require('./styles');

const PREVIEW_COUNT = 6;

const HomepageSection = ({ className, title, items, sectionIndex }) => {
    const seeAllHref = React.useMemo(() => {
        return `#/board/section/${sectionIndex}`;
    }, [sectionIndex]);

    return (
        <div className={classnames(className, styles['homepage-section-container'])}>
            <div className={styles['header-container']}>
                <div className={styles['title-container']} title={title}>{title}</div>
                {
                    items.length > PREVIEW_COUNT ?
                        <Button className={styles['see-all-container']} title={'See All'} href={seeAllHref} tabIndex={-1}>
                            <div className={styles['label']}>See All</div>
                            <Icon className={styles['icon']} name={'chevron-forward'} />
                        </Button>
                        :
                        null
                }
            </div>
            <div className={styles['items-grid']}>
                {items.slice(0, PREVIEW_COUNT).map((item, index) => (
                    <HomepageItem
                        key={item.id || index}
                        className={styles['grid-item']}
                        {...item}
                    />
                ))}
            </div>
        </div>
    );
};

HomepageSection.propTypes = {
    className: PropTypes.string,
    title: PropTypes.string,
    items: PropTypes.array,
    sectionIndex: PropTypes.number,
};

module.exports = HomepageSection;
