// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslate } = require('stremio/common');

const mapSelectableInputs = (discover, t) => {
    if (!discover?.selectable) {
        return [[], discover?.selectable?.nextPage || null];
    }
    const inputs = [];
    if (Array.isArray(discover.selectable.types) && discover.selectable.types.length > 0) {
        const selectedType = discover.selectable.types.find(({ selected }) => selected);
        inputs.push({
            options: discover.selectable.types.map(({ type, deepLinks, name }) => ({
                value: deepLinks.discover,
                label: name || (type === 'all' ? t.string('ALL') : t.stringWithPrefix(type, 'TYPE_'))
            })),
            value: selectedType ? selectedType.deepLinks.discover : undefined,
            title: selectedType ? (selectedType.name || (selectedType.type === 'all' ? t.string('ALL') : t.stringWithPrefix(selectedType.type, 'TYPE_'))) : t.string('SELECT_TYPE'),
            onSelect: (value) => {
                window.location = value;
            }
        });
    }
    if (Array.isArray(discover.selectable.catalogs) && discover.selectable.catalogs.length > 1) {
        inputs.push({
            options: discover.selectable.catalogs
                .map(({ id, name, addon, deepLinks }) => ({
                    value: deepLinks.discover,
                    label: t.catalogTitle({ addon, id, name }),
                    title: `${name} (${addon.manifest.name})`
                })),
            value: discover.selectable.catalogs
                .filter(({ selected }) => selected)
                .map(({ deepLinks }) => deepLinks.discover),
            title: discover.selected !== null
                ? () => {
                    const selectableCatalog = discover.selectable.catalogs
                        .find(({ id }) => id === discover.selected.request.path.id);
                    return selectableCatalog ? t.catalogTitle(selectableCatalog, false) : discover.selected.request.path.id;
                }
                :
                t.string('SELECT_CATALOG'),
            onSelect: (value) => {
                window.location = value;
            }
        });
    }
    const extraSelects = discover.selectable.extra.map(({ name, isRequired, options }) => {
        const selectedExtra = options.find(({ selected }) => selected);
        return {
            isRequired: isRequired,
            options: options.map(({ value, deepLinks }) => ({
                label: typeof value === 'string' ? (t.string(value) || value) : t.string('NONE'),
                value: JSON.stringify({
                    href: deepLinks.discover,
                    value
                })
            })),
            value: selectedExtra ? JSON.stringify({
                href: selectedExtra.deepLinks.discover,
                value: selectedExtra.value,
            }) : undefined,
            title: options.some(({ selected, value }) => selected && value === null) ?
                () => t.string(name.toUpperCase())
                : selectedExtra ? (t.string(selectedExtra.value) || selectedExtra.value) : () => t.string(name.toUpperCase()),
            onSelect: (value) => {
                const { href } = JSON.parse(value);
                window.location = href;
            }
        };
    });
    return [[...inputs, ...extraSelects], discover.selectable.nextPage];
};

const useSelectableInputs = (discover) => {
    const t = useTranslate();
    const selectableInputs = React.useMemo(() => {
        return mapSelectableInputs(discover, t);
    }, [discover.selected, discover.selectable]);
    return selectableInputs;
};

module.exports = useSelectableInputs;
