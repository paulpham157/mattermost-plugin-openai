import React, {useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

// Components
import {ChatInput} from 'components/ChatInput';
import {RenderChatsAndError} from 'containers/Rhs/views/Prompt/SubComponents/RenderChatsAndError';

// Hooks
import usePluginApi from 'hooks/usePluginApi';
import useApiRequestCompletionState from 'hooks/useApiRequestCompletionState';

// Actions
import {addChats, addSummary, popLastChat} from 'reducers/PromptChat.reducer';

// Selectors
import {getAllChats} from 'selectors';

// Utils
import {parseChatCompletionPayload} from 'utils';

// Constants
import {API_SERVICE_CONFIG} from 'constants/apiServiceConfig';
import {ChatCompletionApi, ErrorMessages} from 'constants/common';
import {ChatCompletionApiConfigs} from 'constants/configs';

// Styles
import {Container, ChatArea} from './Prompt.styles';

/**
 * Prompt View
 *
 * @example correct usage
 * ```tsx
 * <Prompt />
 * ```
 */
export const Prompt = () => {
    // Initialize hooks
    const dispatch = useDispatch();
    const {state, getApiState, makeApiRequestWithCompletionStatus} = usePluginApi();
    const [promptValue, setPromptValue] = useState('');
    const [isChatSummarize, setIsChatSummarize] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Selectors
    const {chats} = getAllChats(state);

    /**
     * The below disable of eslint is intentional.
     * The payload needs to be constant till the request cycle to be completed for our custom api to work.
     * We want the payload to change only when the prompt value changes.
     */
    const payload = useMemo(
        () => parseChatCompletionPayload({prompt: promptValue, chatHistory: chats}),
        [promptValue],
    );

    const {data, isLoading} = getApiState(
        API_SERVICE_CONFIG.getChatCompletion.serviceName,
        payload,
    );

    /**
     * On Clicking the send button we are adding the user entered prompt to a state array,
     * and sending request to the open ai servers for the response.
     */
    const handleSend = async () => {
        makeApiRequestWithCompletionStatus(
            API_SERVICE_CONFIG.getChatCompletion.serviceName,
            payload,
        );
        dispatch(
            addChats({
                role: 'user',
                content: promptValue.trim(),
                id: Date.now().toString(),
            }),
        );
    };

    /**
     * Triggers on changing the value in the text area,
     * in `loading` state the user wont be able to change the content in the text area.
     */
    const handleOnChange = ({target: {value}}: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!isLoading) {
            setPromptValue(value);
        }
    };

    /**
     * On getting the success response from the api, we are resetting the text area,
     * and also storing the response in a state array.
     */
    useApiRequestCompletionState({
        serviceName: API_SERVICE_CONFIG.getChatCompletion.serviceName,
        payload,
        handleSuccess: () => {
            setPromptValue('');
            setErrorMessage('');

            if (data?.object === ChatCompletionApi.responseObject) {
                if (isChatSummarize) {
                    dispatch(
                        addSummary({
                            id: data?.id,
                            content: data?.choices[0].message.content,
                            role: 'assistant',
                            isSummary: true,
                        }),
                    );
                    setIsChatSummarize(false);
                    return;
                }

                dispatch(
                    addChats({
                        id: data?.id,
                        content: data?.choices[0].message.content,
                        role: data.choices[0].message.role,
                    }),
                );

                /**
                 * If token limit reached above the threshold limit summarize the chat
                 */
                if (data.usage.total_tokens > ChatCompletionApiConfigs.maxTokenLimitToSummarize) {
                    setPromptValue(ChatCompletionApi.summarizationPrompt);
                    setIsChatSummarize(true);
                }
            }
        },
        handleError: (error) => {
            setPromptValue('');
            dispatch(popLastChat());

            switch (error.data.error?.code) {
                case ChatCompletionApi.invalidApiCode:
                    setErrorMessage(ErrorMessages.invalidApiKey);
                    break;
                case ChatCompletionApi.invalidOrganizationCode:
                    setErrorMessage(ErrorMessages.invalidOrganizationId);
                    break;
                default:
                    setErrorMessage(ErrorMessages.internalServerError);
            }
        },
    });

    /**
     * When isChatSummarize is `true`, hit the chat api to get the summary.
     */
    useEffect(() => {
        if (isChatSummarize && promptValue === ChatCompletionApi.summarizationPrompt) {
            makeApiRequestWithCompletionStatus(
                API_SERVICE_CONFIG.getChatCompletion.serviceName,
                payload,
            );
        }
    }, [isChatSummarize, promptValue]);

    return (
        <Container>
            <ChatArea>
                <RenderChatsAndError chats={chats} errorMessage={errorMessage} />
            </ChatArea>
            <ChatInput
                value={promptValue}
                isLoading={isLoading}
                handleOnChange={handleOnChange}
                handleOnSend={handleSend}
            />
        </Container>
    );
};
