// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, MainNavBars } = require('stremio/components');
const HomepageItem = require('../HomepageItem');
const styles = require('./styles');

const SeeAll = ({ title, items }) => {
    return (
        <div className={styles['see-all-container']}>
            <MainNavBars className={styles['see-all-content-container']} route={'board'}>
                <div className={styles['see-all-content']}>
                    <div className={styles['header']}>
                        <Button className={styles['back-button']} title={'Back'} href={'#/'} tabIndex={-1}>
                            <Icon className={styles['back-icon']} name={'chevron-back'} />
                        </Button>
                        <div className={styles['title']}>{title}</div>
                    </div>
                    <div className={styles['items-grid']}>
                        {items.map((item, index) => (
                            <HomepageItem
                                key={item.id || index}
                                className={styles['grid-item']}
                                {...item}
                            />
                        ))}
                    </div>
                </div>
            </MainNavBars>
        </div>
    );
};

SeeAll.propTypes = {
    title: PropTypes.string,
    items: PropTypes.array,
};

module.exports = SeeAll;
