// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { withCoreSuspender } = require('stremio/common');
const { HorizontalNavBar, DelayedRenderer, Image, MetaPreview } = require('stremio/components');
const CustomMetaPanel = require('./CustomMetaPanel');
const useMetaDetails = require('./useMetaDetails');
const styles = require('./styles');

const MetaDetails = ({ urlParams }) => {
    const { t } = useTranslation();
    const metaDetails = useMetaDetails(urlParams);
    const [metaPath, streamPath] = React.useMemo(() => {
        return metaDetails.selected !== null ?
            [metaDetails.selected.metaPath, metaDetails.selected.streamPath]
            :
            [null, null];
    }, [metaDetails.selected]);

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
            <CustomMetaPanel
                className={classnames(styles['custom-meta-panel'], 'animation-fade-in')}
                meta={metaDetails.metaItem.content.content}
                customInfo={metaDetails.customInfo}
                streams={metaDetails.streams}
                type={urlParams.type}
                streamPath={streamPath}
                libraryItem={metaDetails.libraryItem}
            />
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
