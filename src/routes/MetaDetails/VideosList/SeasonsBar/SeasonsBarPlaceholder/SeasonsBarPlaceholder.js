// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const styles = require('./styles');

const SeasonsBarPlaceholder = ({ className }) => {
    return (
        <div className={classnames(className, styles['seasons-bar-placeholder-container'])}>
            <div className={styles['track']}>
                <div className={classnames(styles['pill'], styles['pill-active'])} />
                <div className={styles['pill']} />
                <div className={styles['pill']} />
                <div className={styles['pill']} />
                <div className={styles['pill']} />
            </div>
        </div>
    );
};

SeasonsBarPlaceholder.propTypes = {
    className: PropTypes.string
};

module.exports = SeasonsBarPlaceholder;
