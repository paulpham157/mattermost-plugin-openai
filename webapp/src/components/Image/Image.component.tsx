import React, {useState} from 'react';
import {useSelector} from 'react-redux';
import {Skeleton, Spinner, Tooltip} from '@brightscout/mattermost-ui-library';
import {saveAs} from 'file-saver';

// Mattermost
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/common';
import {GlobalState} from 'mattermost-redux/types/store';

// Constants
import {DOWNLOAD_ICON, POST_CHANNEL_ICON} from 'constants/icons';
import {API_SERVICE, API_SERVICE_CONFIG} from 'constants/apiServiceConfig';
import {IMAGE_GENERATIONS} from 'constants/common';

// Hooks
import usePluginApi from 'hooks/usePluginApi';
import useApiRequestCompletionState from 'hooks/useApiRequestCompletionState';

// Utils
import {getPluginApiBaseUrl} from 'utils';

// Types
import {ImageProps} from './Image.d';

// Styles
import {
    ImageFooter,
    ImageWrapper,
    SkeletonLoaderWrapper,
    SpinnerWrapper,
    StyledImage,
} from './Image.styles';

/**
 * Image Component
 *
 * @example Correct usage
 * ```tsx
 * <Image
 *  src={src}
 *  alt={alt}
 *  size={size}
 * />
 * ```
 */
export const Image = ({createdAt, src, alt, size = '100%', isImageLoadingError, handleSetIsImageLoadingError}: ImageProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadInProgress, setIsDownloadInProgress] = useState(false);
    const {makeApiRequestWithCompletionStatus} = usePluginApi();

    const currentChannelId = useSelector((state: GlobalState) => getCurrentChannelId(state));

    // Payload
    const payload: PostImageToChannelPayload = {
        channel_id: currentChannelId,
        imageUrl: src,
        fileName: IMAGE_GENERATIONS.fileNameForDownloadedImage,
    };

    /**
     * Downloads the image to the local system on clicking the delete button on image footer.
     */
    const handleDownloadImage = async () => {
        setIsDownloadInProgress(true);
        const response = await fetch(src, {mode: 'no-cors'});
        const blob = await response.blob();
        saveAs(blob, IMAGE_GENERATIONS.fileNameForDownloadedImage);
        setIsDownloadInProgress(false);
    };

    /**
     * Sends the image as post to the current channel in mattermost on clicking the send button on image footer.
     */
    const handleCreatingPostInCurrentChannel = () => {
        setIsDownloadInProgress(true);
        makeApiRequestWithCompletionStatus(
            API_SERVICE_CONFIG.postImageToChannel.serviceName,
            payload,
        );
    };

    useApiRequestCompletionState({
        serviceName: API_SERVICE_CONFIG.postImageToChannel.serviceName,
        services: API_SERVICE.pluginApiService,
        payload,
        handleSuccess: () => setIsDownloadInProgress(false),
    });

    /**
     * Images generated by the OpenAI have an expirty time of 1 hour from the time of generation.
     * We are checking if the "createdAt" is less than 55 minutes with 5 minutes as buffer from the 60 minutes of expiry time
     * then we are considering the images as expired images.
     *
     * @returns boolean, if image is expired
     */
    const isImageExpired = () => ((parseInt(createdAt ?? '0', 10) * 1000) + (55 * 60 * 1000)) < new Date().getTime();

    const getBrokenImageUrl = () => `${getPluginApiBaseUrl().pluginUrl}/public/assets/broken-image.jpg`;

    return (
        <ImageWrapper size={size}>
            {isLoading && (
                <SkeletonLoaderWrapper>
                    <Skeleton variant='rectangular' />
                </SkeletonLoaderWrapper>
            )}
            {isDownloadInProgress && (
                <SpinnerWrapper>
                    <Spinner />
                </SpinnerWrapper>
            )}
            <StyledImage
                isLoading={isLoading}
                src={isImageLoadingError ? getBrokenImageUrl() : src}
                alt={alt}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    handleSetIsImageLoadingError(true);
                    setIsLoading(false);
                }}
            />
            {!isLoading && (
                <ImageFooter isDownloadInProgress={isDownloadInProgress} className='image-footer'>
                    {
                        isImageExpired() || isImageLoadingError ? <span className='image-overlay-text'>Image is expired</span> : (
                            <>
                                <Tooltip text={IMAGE_GENERATIONS.downloadButtonTooltipText}>
                                    <button type='button' onClick={handleDownloadImage}>
                                        {DOWNLOAD_ICON}
                                    </button>
                                </Tooltip>

                                <Tooltip text={IMAGE_GENERATIONS.postToChannelButtonTooltipText}>
                                    <button type='button' onClick={handleCreatingPostInCurrentChannel}>
                                        {POST_CHANNEL_ICON}
                                    </button>
                                </Tooltip>
                            </>
                        )
                    }
                </ImageFooter>
            )}
        </ImageWrapper>
    );
};
