export const API_SERVICE_CONFIG: Record<ApiServiceName, PluginApiService> = {
    getCompletion: {
        path: '/completions',
        method: 'POST',
        serviceName: 'getCompletion',
    },
    getChatCompletion: {
        path: '/chat/completions',
        method: 'POST',
        serviceName: 'getChatCompletion',
    },
    getOpenAIApiKeyFromWebapp: {
        path: '/config',
        method: 'GET',
        serviceName: 'getOpenAIApiKeyFromWebapp',
    },
    getThreadFromPostId: {
        path: '/posts',
        method: 'GET',
        serviceName: 'getThreadFromPostId',
    },
};

export const API_SERVICE = {
    mattermostApiService: 'useMattermostApi',
    pluginApiService: 'usePluginApi',
    openAiApi: 'useOpenAiApi',
} as const;

export type API_SERVICE =
    | typeof API_SERVICE['mattermostApiService']
    | typeof API_SERVICE['pluginApiService']
    | typeof API_SERVICE['openAiApi']
