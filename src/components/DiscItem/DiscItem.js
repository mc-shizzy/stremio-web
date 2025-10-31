// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useServices } = require('stremio/services');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const MetaItem = require('stremio/components/MetaItem');
const { t } = require('i18next');

const DiscItem = ({ id, watched, selected, toggleWatched, ...props }) => {

    const { core } = useServices();

    const options = React.useMemo(() => {
        return [
            { label: watched ? 'CTX_MARK_UNWATCHED' : 'CTX_MARK_WATCHED', value: 'watched' },
        ].filter(({ value }) => {
            switch (value) {
                case 'watched':
                    return props.deepLinks && (typeof props.deepLinks.metaDetailsVideos === 'string' || typeof props.deepLinks.metaDetailsStreams === 'string');
            }
        }).map((option) => ({
            ...option,
            label: t(option.label)
        }));
    }, [id, props.deepLinks, watched]);

    const optionOnSelect = React.useCallback((event) => {
        if (typeof props.optionOnSelect === 'function') {
            props.optionOnSelect(event);
        }

        if (!event.nativeEvent.optionSelectPrevented) {
            switch (event.value) {
                case 'watched': {
                    if (typeof id === 'string') {
                        if (typeof toggleWatched === 'function') {
                            toggleWatched();
                        }
                    }

                    break;
                }
            }
        }
    }, [id, props.deepLinks, props.optionOnSelect]);

    return (
        <MetaItem
            {...props}
            watched={watched}
            playname={selected}
            className={classnames({ 'selected': selected })}
            options={options}
            optionOnSelect={optionOnSelect}
        />
    );
};

DiscItem.propTypes = {
    id: PropTypes.string,
    removable: PropTypes.bool,
    watched: PropTypes.bool,
    selected: PropTypes.bool,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    toggleWatched: PropTypes.func,
    optionOnSelect: PropTypes.func
};

module.exports = DiscItem;
