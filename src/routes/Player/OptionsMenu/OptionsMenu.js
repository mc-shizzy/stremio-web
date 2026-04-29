// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { useToast } = require('stremio/common');
const { useServices } = require('stremio/services');
const Option = require('./Option');
const styles = require('./styles');
const { AUDIO_PREFERENCES } = require('stremio/common/customAudioPreference');

const OptionsMenu = React.memo(React.forwardRef(({ className, stream, playbackDevices, qualityOptions, selectedQuality, onQualitySelected, audioPreference, onAudioPreferenceSelected }, ref) => {
    const { t } = useTranslation();
    const { core } = useServices();
    const toast = useToast();
    const [streamingUrl, magnetUrl] = React.useMemo(() => {
        return stream !== null ?
            stream.deepLinks &&
            stream.deepLinks.externalPlayer &&
            [
                stream.deepLinks.externalPlayer.streaming,
                stream.deepLinks.externalPlayer.magnet,
            ]
            :
            [null, null];
    }, [stream]);
    const externalDevices = React.useMemo(() => {
        return playbackDevices.filter(({ type }) => type === 'external');
    }, [playbackDevices]);

    const onCopyMagnetButtonClick = React.useCallback(() => {
        if (magnetUrl) {
            navigator.clipboard.writeText(magnetUrl)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: 'Copied',
                        message: t('PLAYER_COPY_MAGNET_LINK_SUCCESS'),
                        timeout: 3000
                    });
                })
                .catch((e) => {
                    console.error(e);
                    toast.show({
                        type: 'error',
                        title: t('Error'),
                        message: `${t('PLAYER_COPY_MAGNET_LINK_ERROR')}: ${magnetUrl}`,
                        timeout: 3000
                    });
                });
        }
    }, [magnetUrl]);
    const onExternalDeviceRequested = React.useCallback((deviceId) => {
        if (streamingUrl) {
            core.transport.dispatch({
                action: 'StreamingServer',
                args: {
                    action: 'PlayOnDevice',
                    args: {
                        device: deviceId,
                        source: streamingUrl,
                    }
                }
            });
        }
    }, [streamingUrl]);
    const onMouseDown = React.useCallback((event) => {
        event.nativeEvent.optionsMenuClosePrevented = true;
    }, []);
    const qualityOptionsSorted = React.useMemo(() => {
        if (!Array.isArray(qualityOptions)) {
            return [];
        }
        return [...qualityOptions].sort((left, right) => (right.quality || 0) - (left.quality || 0));
    }, [qualityOptions]);

    return (
        <div ref={ref} className={classnames(className, styles['options-menu-container'])} onMouseDown={onMouseDown}>
            {
                typeof onAudioPreferenceSelected === 'function' ?
                    <>
                        <Option
                            icon={'audio'}
                            label={`Original (English)${audioPreference === AUDIO_PREFERENCES.ORIGINAL ? ' • current' : ''}`}
                            deviceId={AUDIO_PREFERENCES.ORIGINAL}
                            disabled={stream === null}
                            onClick={onAudioPreferenceSelected}
                        />
                        <Option
                            icon={'audio'}
                            label={`French Dubbed${audioPreference === AUDIO_PREFERENCES.FRENCH ? ' • current' : ''}`}
                            deviceId={AUDIO_PREFERENCES.FRENCH}
                            disabled={stream === null}
                            onClick={onAudioPreferenceSelected}
                        />
                    </>
                    :
                    null
            }
            {
                qualityOptionsSorted.map((qualityOption) => (
                    <Option
                        key={`${qualityOption.quality}-${qualityOption.format || ''}`}
                        icon={'speed'}
                        label={`${qualityOption.quality}p${qualityOption.format ? ` (${String(qualityOption.format).toUpperCase()})` : ''}${selectedQuality === qualityOption.quality ? ' • current' : ''}`}
                        deviceId={String(qualityOption.quality)}
                        disabled={stream === null}
                        onClick={onQualitySelected}
                    />
                ))
            }
            {
                magnetUrl ?
                    <Option
                        icon={'magnet-link'}
                        label={t('CTX_COPY_MAGNET_LINK')}
                        disabled={stream === null}
                        onClick={onCopyMagnetButtonClick}
                    />
                    :
                    null
            }
            {
                streamingUrl && externalDevices.map(({ id, name }) => (
                    <Option
                        key={id}
                        icon={'vlc'}
                        label={t('PLAYER_PLAY_IN', { device: name })}
                        deviceId={id}
                        disabled={stream === null}
                        onClick={onExternalDeviceRequested}
                    />
                ))
            }
        </div>
    );
}));

OptionsMenu.propTypes = {
    className: PropTypes.string,
    stream: PropTypes.object,
    playbackDevices: PropTypes.array,
    qualityOptions: PropTypes.array,
    selectedQuality: PropTypes.number,
    onQualitySelected: PropTypes.func,
    audioPreference: PropTypes.string,
    onAudioPreferenceSelected: PropTypes.func,
};

module.exports = OptionsMenu;
