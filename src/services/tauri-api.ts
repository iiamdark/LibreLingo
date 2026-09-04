// Tauri API client wrapper with live fallback for browser preview

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
    // Browser preview mode with real web translation fallback
    return liveBrowserInvoke<T>(cmd, args);
  }
}

// In-memory / localStorage simulation for browser preview
function getStoredBrowserConfig(): Record<string, { apiKey?: string; customUrl?: string }> {
  try {
    return JSON.parse(localStorage.getItem('librelingo_browser_config') || '{}');
  } catch {
    return {};
  }
}

function saveStoredBrowserConfig(cfg: Record<string, { apiKey?: string; customUrl?: string }>) {
  localStorage.setItem('librelingo_browser_config', JSON.stringify(cfg));
}

function getStoredHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem('librelingo_browser_history') || '[]');
  } catch {
    return [];
  }
}

function saveStoredHistory(items: HistoryItem[]) {
  localStorage.setItem('librelingo_browser_history', JSON.stringify(items.slice(0, 100)));
}

// Live browser translation handler
async function liveBrowserInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case 'translate_text': {
      const req = (args?.req as TranslationRequest) || { text: '', source_lang: 'auto', target_lang: 'es', provider_id: 'google' };
      if (!req.text.trim()) {
        return { translated_text: '', detected_source_lang: undefined, provider_used: req.provider_id } as unknown as T;
      }

      const cfg = getStoredBrowserConfig()[req.provider_id] || {};

      // If OpenRouter is chosen and has API key
      if (req.provider_id === 'openrouter' && cfg.apiKey) {
        try {
          const model = cfg.customUrl || 'google/gemini-2.0-flash-lite-001';
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cfg.apiKey}`,
              'HTTP-Referer': 'https://github.com/iiamdark/LibreLingo',
              'X-Title': 'LibreLingo'
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: `Translate to language '${req.target_lang}'. Output raw translated text ONLY without notes or markdown.`
                },
                { role: 'user', content: req.text }
              ],
              temperature: 0.2
            })
          });

          const data = await res.json();
          const translated = data.choices?.[0]?.message?.content?.trim() || req.text;
          const resp: TranslationResponse = {
            translated_text: translated,
            detected_source_lang: req.source_lang === 'auto' ? undefined : req.source_lang,
            provider_used: `OpenRouter (${model})`
          };

          // Record in history
          const history = getStoredHistory();
          history.unshift({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            source_text: req.text,
            translated_text: translated,
            source_lang: req.source_lang,
            target_lang: req.target_lang,
            provider_id: req.provider_id
          });
          saveStoredHistory(history);

          return resp as unknown as T;
        } catch (err) {
          console.error('OpenRouter live translation failed in browser:', err);
        }
      }

      // Default high-speed live web translation via Google
      try {
        const sl = req.source_lang === 'auto' ? 'auto' : req.source_lang;
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${req.target_lang}&dt=t&q=${encodeURIComponent(req.text)}`;
        const res = await fetch(url);
        const data = await res.json();

        let translated = '';
        if (Array.isArray(data[0])) {
          translated = data[0].map((chunk: any) => chunk[0]).join('');
        }
        const detected = data[2];

        const resp: TranslationResponse = {
          translated_text: translated || req.text,
          detected_source_lang: detected || undefined,
          provider_used: req.provider_id === 'google' ? 'Google Translate (Free Web)' : `${req.provider_id} (Browser Live)`
        };

        // Record in history
        const history = getStoredHistory();
        history.unshift({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          source_text: req.text,
          translated_text: resp.translated_text,
          source_lang: detected || req.source_lang,
          target_lang: req.target_lang,
          provider_id: req.provider_id
        });
        saveStoredHistory(history);

        return resp as unknown as T;
      } catch (err) {
        console.warn('Direct live translation error:', err);
        return {
          translated_text: req.text,
          detected_source_lang: undefined,
          provider_used: req.provider_id
        } as unknown as T;
      }
    }

    case 'get_providers': {
      const cfg = getStoredBrowserConfig();
      return [
        {
          id: 'google',
          name: 'Google Translate (Free Web)',
          description: 'Instant translation with zero configuration. No API key required.',
          requires_api_key: false,
          has_configured_key: true,
          allows_custom_url: false,
        },
        {
          id: 'openrouter',
          name: 'OpenRouter AI (LLM)',
          description: 'AI-powered translation via OpenRouter (Gemini, Llama 3, Claude, GPT-4o). Requires API key.',
          requires_api_key: true,
          has_configured_key: !!cfg.openrouter?.apiKey,
          allows_custom_url: true,
          custom_url: cfg.openrouter?.customUrl,
          default_url: 'google/gemini-2.0-flash-lite-001'
        },
        {
          id: 'libretranslate',
          name: 'LibreTranslate (Open Source)',
          description: '100% open-source machine translation. Works with self-hosted Docker instances (e.g. http://localhost:5000).',
          requires_api_key: false,
          has_configured_key: false,
          allows_custom_url: true,
          custom_url: cfg.libretranslate?.customUrl,
          default_url: 'https://translate.argosopentech.com'
        },
        {
          id: 'deepl',
          name: 'DeepL Translator (API)',
          description: 'Industry-leading neural translation quality. Requires a DeepL API key (free :fx or Pro).',
          requires_api_key: true,
          has_configured_key: !!cfg.deepl?.apiKey,
          allows_custom_url: false
        }
      ] as unknown as T;
    }

    case 'get_supported_languages':
      return [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'zh', name: 'Chinese (Simplified)' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' },
        { code: 'tr', name: 'Turkish' },
        { code: 'uk', name: 'Ukrainian' },
        { code: 'sv', name: 'Swedish' },
        { code: 'el', name: 'Greek' }
      ] as unknown as T;

    case 'get_history':
      return getStoredHistory() as unknown as T;

    case 'clear_history':
      saveStoredHistory([]);
      return undefined as unknown as T;

    case 'save_provider_config': {
      const payload = (args?.payload as ProviderConfigPayload);
      if (payload) {
        const cfg = getStoredBrowserConfig();
        cfg[payload.provider_id] = {
          apiKey: payload.api_key,
          customUrl: payload.custom_url
        };
        saveStoredBrowserConfig(cfg);
      }
      return undefined as unknown as T;
    }

    default:
      return {} as unknown as T;
  }
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
