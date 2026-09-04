// Tauri API client wrapper with fallback mock for local browser development

export interface TranslationRequest {
  text: string;
  source_lang: string;
  target_lang: string;
  provider_id: string;
}

export interface TranslationResponse {
  translated_text: string;
  detected_source_lang?: string;
  provider_used: string;
}

export interface DetectedLanguage {
  language: string;
  confidence?: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  requires_api_key: boolean;
  has_configured_key: boolean;
  allows_custom_url: boolean;
  custom_url?: string;
  default_url?: string;
}

export interface ProviderConfigPayload {
  provider_id: string;
  api_key?: string;
  custom_url?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  provider_id: string;
}

// Detect if running inside a Tauri webview
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Safe invoke wrapper
async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } else {
    // Browser development preview mock
    console.info(`[Dev Mock] Invoking command: ${cmd}`, args);
    return mockInvoke<T>(cmd, args);
  }
}

// Mock responses for browser development preview
function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (cmd) {
        case 'translate_text': {
          const req = (args?.req as TranslationRequest) || { text: '' };
          resolve({
            translated_text: `[Mock Translation - ${req.provider_id}] ${req.text}`,
            detected_source_lang: 'en',
            provider_used: 'LibreTranslate (Mock Dev)'
          } as unknown as T);
          break;
        }
        case 'get_providers':
          resolve([
            {
              id: 'libretranslate',
              name: 'LibreTranslate (Open Source)',
              description: '100% open-source machine translation. Works with public instances or your own self-hosted local server.',
              requires_api_key: false,
              has_configured_key: false,
              allows_custom_url: true,
              default_url: 'https://translate.argosopentech.com'
            },
            {
              id: 'deepl',
              name: 'DeepL Translator (API)',
              description: 'Industry-leading neural translation quality. Requires a free or Pro DeepL API key.',
              requires_api_key: true,
              has_configured_key: false,
              allows_custom_url: false
            }
          ] as unknown as T);
          break;
        case 'get_supported_languages':
          resolve([
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'zh', name: 'Chinese (Simplified)' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ru', name: 'Russian' },
            { code: 'ar', name: 'Arabic' }
          ] as unknown as T);
          break;
        case 'get_history':
          resolve([
            {
              id: '1',
              timestamp: new Date().toISOString(),
              source_text: 'Hello world, welcome to LibreLingo',
              translated_text: 'Hola mundo, bienvenido a LibreLingo',
              source_lang: 'en',
              target_lang: 'es',
              provider_id: 'libretranslate'
            }
          ] as unknown as T);
          break;
        case 'save_provider_config':
        case 'clear_history':
        case 'remove_provider_key':
          resolve(undefined as unknown as T);
          break;
        default:
          resolve({} as unknown as T);
      }
    }, 250);
  });
}

export const api = {
  async translate(req: TranslationRequest): Promise<TranslationResponse> {
    return await invokeTauri<TranslationResponse>('translate_text', { req });
  },

  async detectLanguage(providerId: string, text: string): Promise<DetectedLanguage> {
    return await invokeTauri<DetectedLanguage>('detect_language', { providerId, text });
  },

  async getSupportedLanguages(providerId: string): Promise<LanguageInfo[]> {
    return await invokeTauri<LanguageInfo[]>('get_supported_languages', { providerId });
  },

  async getProviders(): Promise<ProviderMetadata[]> {
    return await invokeTauri<ProviderMetadata[]>('get_providers');
  },

  async saveProviderConfig(payload: ProviderConfigPayload): Promise<void> {
    return await invokeTauri<void>('save_provider_config', { payload });
  },

  async removeProviderKey(providerId: string): Promise<void> {
    return await invokeTauri<void>('remove_provider_key', { providerId });
  },

  async getHistory(): Promise<HistoryItem[]> {
    return await invokeTauri<HistoryItem[]>('get_history');
  },

  async clearHistory(): Promise<void> {
    return await invokeTauri<void>('clear_history');
  }
};
