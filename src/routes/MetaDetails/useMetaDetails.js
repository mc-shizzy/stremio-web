// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useModelState } = require('stremio/common');
const { useServices } = require('stremio/services');
const { getResumeTime } = require('stremio/common/customContinueWatching');
const { AUDIO_PREFERENCES, resolvePreferredSubjectId } = require('stremio/common/customAudioPreference');

const INFO_API_URL = 'https://apii.freehandyflix.online/api/info';
const SOURCES_API_URL = 'https://apii.freehandyflix.online/api/sources';

const map = (metaDetails) => ({
    ...metaDetails,
    metaItem: metaDetails.metaItem !== null && metaDetails.metaItem.content.type === 'Ready' ?
        {
            ...metaDetails.metaItem,
            content: {
                ...metaDetails.metaItem.content,
                content: {
                    ...metaDetails.metaItem.content.content,
                    released: new Date(
                        typeof metaDetails.metaItem.content.content.released === 'string' ?
                            metaDetails.metaItem.content.content.released
                            :
                            NaN
                    ),
                    videos: metaDetails.metaItem.content.content.videos.map((video) => ({
                        ...video,
                        released: new Date(
                            typeof video.released === 'string' ?
                                video.released
                                :
                                NaN
                        ),
                    }))
                }
            }
        }
        :
        metaDetails.metaItem
});

const API_TRANSPORT_URL = 'https://apii.freehandyflix.online';

const parseSeriesVideoId = (videoId) => {
    if (typeof videoId !== 'string') {
        return null;
    }
    const parts = videoId.split(':');
    if (parts.length < 3) {
        return null;
    }
    const season = parseInt(parts[1], 10);
    const episode = parseInt(parts[2], 10);
    return !isNaN(season) && !isNaN(episode) ? { season, episode } : null;
};

const normalizeSubtitles = (captions) => {
    if (!Array.isArray(captions)) {
        return [];
    }
    return captions
        .filter((caption) => typeof caption?.url === 'string' && caption.url.length > 0)
        .map((caption, index) => ({
            id: `api-sub-${index}-${caption.url}`,
            lang: caption.lan || caption.lang || 'eng',
            label: caption.label || caption.name || caption.lan || caption.lang || 'Subtitle',
            origin: 'EXCLUSIVE',
            embedded: false,
            url: caption.url,
            fallbackUrl: caption.url
        }));
};

const useMetaDetails = (urlParams) => {
    const { core } = useServices();
    const isCustomSubjectId = React.useMemo(() => /^\d+$/.test(urlParams?.id || ''), [urlParams?.id]);
    const action = React.useMemo(() => {
        if (isCustomSubjectId) {
            return {
                action: 'Unload'
            };
        }
        if (typeof urlParams.type === 'string' && typeof urlParams.id === 'string') {
            return {
                action: 'Load',
                args: {
                    model: 'MetaDetails',
                    args: {
                        metaPath: {
                            resource: 'meta',
                            type: urlParams.type,
                            id: urlParams.id,
                            extra: []
                        },
                        streamPath: typeof urlParams.videoId === 'string' && urlParams.videoId !== '' ?
                            {
                                resource: 'stream',
                                type: urlParams.type,
                                id: urlParams.videoId,
                                extra: []
                            }
                            :
                            null,
                        guessStream: true,
                    }
                }
            };
        } else {
            return {
                action: 'Unload'
            };
        }
    }, [urlParams, isCustomSubjectId]);
    const coreMetaDetails = useModelState({ model: 'meta_details', action, map });
    const [customMetaDetails, setCustomMetaDetails] = React.useState({
        selected: null,
        metaItem: null,
        streams: [],
        libraryItem: null,
        ratingInfo: null,
        metaExtensions: [],
        isCustomApi: true,
        customInfo: { stars: [], stills: null, trailer: null, genre: '', imdbRating: null }
    });

    React.useEffect(() => {
        if (!isCustomSubjectId || typeof urlParams.type !== 'string' || typeof urlParams.id !== 'string') {
            return;
        }

        let cancelled = false;
        const subjectId = urlParams.id;
        const type = urlParams.type;
        const selected = {
            metaPath: {
                resource: 'meta',
                type,
                id: subjectId,
                extra: []
            },
            streamPath: null
        };

        if (type === 'movie' || (typeof urlParams.videoId === 'string' && urlParams.videoId.length > 0)) {
            selected.streamPath = {
                resource: 'stream',
                type,
                id: type === 'movie' ? subjectId : urlParams.videoId,
                extra: []
            };
        }

        setCustomMetaDetails({
            selected,
            metaItem: { content: { type: 'Loading' } },
            streams: type === 'movie' || selected.streamPath !== null ? [{ content: { type: 'Loading' } }] : [],
            libraryItem: null,
            ratingInfo: null,
            metaExtensions: [],
            isCustomApi: true,
            customInfo: { stars: [], stills: null, trailer: null, genre: '', imdbRating: null }
        });

        const fetchCustomMetaDetails = async () => {
            try {
                const infoResponse = await fetch(`${INFO_API_URL}/${encodeURIComponent(subjectId)}`);
                if (!infoResponse.ok) {
                    throw new Error(`Info API failed with status ${infoResponse.status}`);
                }
                const infoPayload = await infoResponse.json();
                const subject = infoPayload?.data?.subject || {};
                const resource = infoPayload?.data?.resource || {};
                const customInfo = {
                    stars: Array.isArray(infoPayload?.data?.stars) ? infoPayload.data.stars : [],
                    stills: subject.stills && typeof subject.stills.url === 'string' ? subject.stills : null,
                    trailer: subject.trailer && subject.trailer.videoAddress?.url ? subject.trailer : null,
                    genre: typeof subject.genre === 'string' ? subject.genre : '',
                    imdbRating: subject.imdbRatingValue || null,
                };
                const seasons = Array.isArray(resource.seasons) ? resource.seasons : [];
                const videos = seasons.flatMap((seasonInfo) => {
                    const season = parseInt(seasonInfo.se, 10);
                    const maxEp = parseInt(seasonInfo.maxEp, 10);
                    if (isNaN(season) || isNaN(maxEp) || maxEp <= 0) {
                        return [];
                    }

                    return Array.from({ length: maxEp }, (_, index) => {
                        const episode = index + 1;
                        const videoId = `${subjectId}:${season}:${episode}`;
                        return {
                            id: videoId,
                            title: `Episode ${episode}`,
                            season,
                            episode,
                            released: new Date(typeof subject.releaseDate === 'string' ? subject.releaseDate : NaN),
                            thumbnail: subject.cover?.url || '',
                            upcoming: false,
                            watched: false,
                            progress: 0,
                            scheduled: false,
                            deepLinks: {
                                metaDetailsStreams: `#/metadetails/${type}/${encodeURIComponent(subjectId)}/${encodeURIComponent(videoId)}`
                            }
                        };
                    });
                });

                const metaItem = {
                    content: {
                        type: 'Ready',
                        content: {
                            id: String(subject.subjectId || subjectId),
                            type,
                            name: subject.title || '',
                            logo: '',
                            background: subject.cover?.url || '',
                            runtime: subject.duration ? `${subject.duration} min` : '',
                            releaseInfo: typeof subject.releaseDate === 'string' ? subject.releaseDate.split('-')[0] : '',
                            released: new Date(typeof subject.releaseDate === 'string' ? subject.releaseDate : NaN),
                            description: subject.description || '',
                            links: [],
                            trailerStreams: [],
                            inLibrary: false,
                            watched: false,
                            videos,
                        }
                    }
                };

                const streamQuery = type === 'series' ? parseSeriesVideoId(urlParams.videoId) : null;
                const shouldLoadSources = type === 'movie' || streamQuery !== null;
                let streams = [];
                if (shouldLoadSources) {
                    const preferredSubjectId = await resolvePreferredSubjectId({
                        subjectId,
                        title: subject.title || '',
                        type,
                        preference: AUDIO_PREFERENCES.FRENCH
                    });
                    const preferredAudio = preferredSubjectId !== String(subjectId) ? AUDIO_PREFERENCES.FRENCH : AUDIO_PREFERENCES.ORIGINAL;
                    const query = streamQuery ? `?season=${streamQuery.season}&episode=${streamQuery.episode}` : '';
                    const sourcesResponse = await fetch(`${SOURCES_API_URL}/${encodeURIComponent(preferredSubjectId)}${query}`);
                    if (sourcesResponse.ok) {
                        const sourcesPayload = await sourcesResponse.json();
                        const processedSources = Array.isArray(sourcesPayload?.data?.processedSources) ? sourcesPayload.data.processedSources : [];
                        const subtitles = normalizeSubtitles(sourcesPayload?.data?.captions);
                        const streamItems = await Promise.all(processedSources.map(async (source) => {
                            const streamUrl = source.proxyUrl || source.directUrl;
                            let playerLink = source.proxyUrl || source.directUrl || '';
                            const quality = typeof source.quality === 'number' ? source.quality : null;
                            if (typeof streamUrl === 'string' && streamUrl.length > 0) {
                                try {
                                    const encoded = await core.transport.encodeStream({ url: streamUrl });
                                    if (typeof encoded === 'string') {
                                        const params = new URLSearchParams({
                                            customSubjectId: String(preferredSubjectId),
                                            customType: type,
                                            audio: preferredAudio,
                                            title: subject.title || ''
                                        });
                                        if (streamQuery) {
                                            params.set('season', String(streamQuery.season));
                                            params.set('episode', String(streamQuery.episode));
                                        }
                                        if (quality !== null) {
                                            params.set('quality', String(quality));
                                        }
                                        const resumeTime = getResumeTime({
                                            subjectId,
                                            type,
                                            season: streamQuery?.season ?? null,
                                            episode: streamQuery?.episode ?? null
                                        });
                                        if (resumeTime > 0) {
                                            params.set('startTime', String(resumeTime));
                                        }
                                        playerLink = `#/player/${encodeURIComponent(encoded)}?${params.toString()}`;
                                    }
                                } catch (_error) {
                                    // Fallback to direct URL if encoding fails.
                                }
                            }
                            const sizeInMb = !isNaN(parseInt(source.size, 10)) ? (parseInt(source.size, 10) / (1024 * 1024)).toFixed(0) : null;
                            return {
                                name: `${source.quality || ''}p ${source.format ? String(source.format).toUpperCase() : ''}`.trim(),
                                description: sizeInMb ? `${sizeInMb} MB` : 'Stream',
                                thumbnail: subject.cover?.url || '',
                                progress: 0,
                                subtitles,
                                deepLinks: {
                                    player: playerLink,
                                    externalPlayer: {
                                        streaming: source.directUrl || '',
                                        download: source.proxyUrl || source.directUrl || '',
                                        qualityVariants: processedSources.map((variantSource) => ({
                                            quality: variantSource.quality,
                                            format: variantSource.format,
                                            streamUrl: variantSource.proxyUrl || variantSource.directUrl || ''
                                        })),
                                    }
                                }
                            };
                        }));

                        streams = [{
                            addon: {
                                transportUrl: API_TRANSPORT_URL,
                                manifest: {
                                    name: 'Freehandyflix'
                                }
                            },
                            content: {
                                type: 'Ready',
                                content: streamItems
                            }
                        }];
                    }
                }

                if (!cancelled) {
                    setCustomMetaDetails({
                        selected,
                        metaItem,
                        streams,
                        libraryItem: null,
                        ratingInfo: null,
                        metaExtensions: [],
                        isCustomApi: true,
                        customInfo
                    });
                }
            } catch (_error) {
                if (!cancelled) {
                    setCustomMetaDetails({
                        selected,
                        metaItem: { content: { type: 'Err', content: 'Custom API failed' } },
                        streams: [],
                        libraryItem: null,
                        ratingInfo: null,
                        metaExtensions: [],
                        isCustomApi: true
                    });
                }
            }
        };

        fetchCustomMetaDetails();

        return () => {
            cancelled = true;
        };
    }, [core, isCustomSubjectId, urlParams]);

    return isCustomSubjectId ? customMetaDetails : coreMetaDetails;
};

module.exports = useMetaDetails;
