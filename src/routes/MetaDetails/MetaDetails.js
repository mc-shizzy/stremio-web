// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useServices } = require('stremio/services');
const { withCoreSuspender } = require('stremio/common');
const { HorizontalNavBar, DelayedRenderer, Image, MetaPreview } = require('stremio/components');
const StreamsList = require('./StreamsList');
const VideosList = require('./VideosList');
const CustomMetaPanel = require('./CustomMetaPanel');
const useMetaDetails = require('./useMetaDetails');
const useSeason = require('./useSeason');
const styles = require('./styles');

const MetaDetails = ({ urlParams, queryParams }) => {
    const { t } = useTranslation();
    const { core } = useServices();
    const metaDetails = useMetaDetails(urlParams);
    const [season, setSeason] = useSeason(urlParams, queryParams);
    const [metaPath, streamPath] = React.useMemo(() => {
        return metaDetails.selected !== null ?
            [metaDetails.selected.metaPath, metaDetails.selected.streamPath]
            :
            [null, null];
    }, [metaDetails.selected]);
    const video = React.useMemo(() => {
        return streamPath !== null && metaDetails.metaItem !== null && metaDetails.metaItem.content.type === 'Ready' ?
            metaDetails.metaItem.content.content.videos.reduce((result, video) => {
                if (video.id === streamPath.id) {
                    return video;
                }

                return result;
            }, null)
            :
            null;
    }, [metaDetails.metaItem, streamPath]);
    const toggleNotifications = React.useCallback(() => {
        if (metaDetails.libraryItem) {
            core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'ToggleLibraryItemNotifications',
                    args: [metaDetails.libraryItem._id, !metaDetails.libraryItem.state.noNotif],
                }
            });
        }
    }, [metaDetails.libraryItem]);
    const seasonOnSelect = React.useCallback((event) => {
        setSeason(event.value);
    }, [setSeason]);
    const handleEpisodeSearch = React.useCallback((season, episode) => {
        const searchVideoHash = encodeURIComponent(`${urlParams.id}:${season}:${episode}`);
        const url = window.location.hash;

        const searchVideoPath = (urlParams.videoId === undefined || urlParams.videoId === null || urlParams.videoId === '') ?
            url + (!url.endsWith('/') ? '/' : '') + searchVideoHash
            : url.replace(encodeURIComponent(urlParams.videoId), searchVideoHash);

        window.location = searchVideoPath;
    }, [urlParams, window.location]);

    const renderBackgroundImageFallback = React.useCallback(() => null, []);
    const renderBackground = React.useMemo(() => !!(
        metaPath &&
        metaDetails?.metaItem &&
        metaDetails.metaItem.content.type !== 'Loading' &&
        typeof metaDetails.metaItem.content.content?.background === 'string' &&
        metaDetails.metaItem.content.content.background.length > 0
    ), [metaPath, metaDetails]);

    const renderDetailsContent = () => {
        if (metaPath === null) {
            return (
                <DelayedRenderer delay={500}>
                    <div className={styles['meta-message-container']}>
                        <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                        <div className={styles['message-label']}>{t('ERR_NO_META_SELECTED')}</div>
                    </div>
                </DelayedRenderer>
            );
        }
        if (metaDetails.metaItem === null || metaDetails.metaItem.content.type === 'Loading') {
            return <MetaPreview.Placeholder className={styles['custom-meta-panel']} />;
        }
        if (metaDetails.metaItem.content.type === 'Err') {
            return (
                <div className={styles['meta-message-container']}>
                    <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                    <div className={styles['message-label']}>{t('ERR_NO_META_FOUND')}</div>
                </div>
            );
        }
        return (
            <React.Fragment>
                <CustomMetaPanel
                    className={classnames(styles['custom-meta-panel'], 'animation-fade-in')}
                    meta={metaDetails.metaItem.content.content}
                    customInfo={metaDetails.customInfo}
                    streams={metaDetails.streams}
                    type={urlParams.type}
                    streamPath={streamPath}
                    libraryItem={metaDetails.libraryItem}
                />
            </React.Fragment>
        );
    };

    return (
        <div className={styles['metadetails-container']}>
            {
                renderBackground ?
                    <div className={styles['background-image-layer']}>
                        <Image
                            className={styles['background-image']}
                            src={metaDetails.metaItem.content.content.background}
                            renderFallback={renderBackgroundImageFallback}
                            alt={' '}
                        />
                    </div>
                    :
                    null
            }
            <HorizontalNavBar
                className={styles['nav-bar']}
                backButton={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <div className={styles['metadetails-content']}>
                {renderDetailsContent()}
            </div>
        </div>
    );
};

MetaDetails.propTypes = {
    urlParams: PropTypes.shape({
        type: PropTypes.string,
        id: PropTypes.string,
        videoId: PropTypes.string
    }),
    queryParams: PropTypes.instanceOf(URLSearchParams)
};

const MetaDetailsFallback = () => (
    <div className={styles['metadetails-container']}>
        <HorizontalNavBar
            className={styles['nav-bar']}
            backButton={true}
            fullscreenButton={true}
            navMenu={true}
        />
    </div>
);

module.exports = withCoreSuspender(MetaDetails, MetaDetailsFallback);
