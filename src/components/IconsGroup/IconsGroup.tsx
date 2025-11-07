// Copyright (C) 2017-2023 Smart code 203358507

import classNames from 'classnames';
import React from 'react';
import Icon from '@stremio/stremio-icons/react';
import styles from './IconsGroup.less';
import { Tooltip } from 'stremio/common/Tooltips';

type GroupItem = {
    icon: string;
    label?: string;
    filled?: string;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
};

type Props = {
    items: GroupItem[];
    className?: string;
};

const IconsGroup = ({ items, className }: Props) => {
    return (
        <div className={classNames(styles['group-container'], className)}>
            {items.map((item, index) => (
                <div key={index}
                    className={classNames(styles['icon-container'], item.className, { [styles['disabled']]: item.disabled })}
                    onClick={item.onClick}
                >
                    {item.label && <Tooltip label={item.label} position={'top'} />}
                    <Icon name={item.icon} className={styles['icon']} />
                </div>
            ))}
        </div>
    );
};

export default IconsGroup;
