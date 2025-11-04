// Copyright (C) 2017-2025 Smart code 203358507

import React, { useMemo } from 'react';
import useRating from './useRating';
import { IconsGroup } from 'stremio/components/IconsGroup';

type Props = {
    metaId?: string;
    ratingInfo?: Loadable<RatingInfo>;
    className?: string;
};

const Ratings = ({ ratingInfo, className }: Props) => {
    const { onLiked, onLoved, liked, loved } = useRating(ratingInfo);
    const disabled = useMemo(() => ratingInfo?.type !== 'Ready', [ratingInfo]);
    const items = useMemo(() => [
        {
            icon: liked ? 'thumbs-up' : 'thumbs-up-outline',
            disabled,
            onClick: onLiked,
        },
        {
            icon: loved ? 'heart' : 'heart-outline',
            disabled,
            onClick: onLoved,
        },
    ], [liked, loved, disabled, onLiked, onLoved]);

    return <IconsGroup items={items} className={className} />;
};

export default Ratings;
