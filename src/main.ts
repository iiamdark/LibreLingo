import './styles/app.css';
import { api, HistoryItem, LanguageInfo, ProviderConfigPayload, ProviderMetadata } from './services/tauri-api';
import { createHeader } from './components/Header';
import { createTranslationBox } from './components/TranslationBox';
import { createSettingsModal } from './components/SettingsModal';
import { createHistoryDrawer } from './components/HistoryDrawer';

class LibreLingoApp {
  private container: HTMLElement;
  private currentProviderId: string = 'libretranslate';
  private sourceLang: string = 'auto';
  private targetLang: string = 'es';
  private sourceText: string = '';
  private translatedText: string = '';
  private detectedLang?: string;
  private isTranslating: boolean = false;
  private errorMessage?: string;
  private isDark: boolean = true;
  
  private providers: ProviderMetadata[] = [];
  private languages: LanguageInfo[] = [];
  private history: HistoryItem[] = [];

  private debounceTimer: number | null = null;
  private activeModal: HTMLElement | null = null;
  private activeDrawer: HTMLElement | null = null;

  constructor(rootId: string) {
    const el = document.getElementById(rootId);
    if (!el) throw new Error(`Root element #${rootId} not found`);
    this.container = el;

    this.initTheme();
    this.initData();
    this.setupGlobalShortcuts();
  }

  private initTheme() {
    const savedTheme = localStorage.getItem('librelingo_theme');
    if (savedTheme) {
      this.isDark = savedTheme === 'dark';
    } else {
      this.isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
  }

  private toggleTheme() {
    this.isDark = !this.isDark;
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    localStorage.setItem('librelingo_theme', this.isDark ? 'dark' : 'light');
  }

  private async initData() {
    try {
      this.providers = await api.getProviders();
      if (this.providers.length > 0) {
        this.currentProviderId = this.providers[0].id;
      }
      
      await this.loadLanguages();
      this.history = await api.getHistory();
    } catch (err: any) {
      console.error('Failed to initialize app data:', err);
      this.errorMessage = err?.message || 'Failed to communicate with LibreLingo backend';
    } finally {
      this.render();
    }
  }

  private async loadLanguages() {
    try {
      this.languages = await api.getSupportedLanguages(this.currentProviderId);
      // If target language is not supported, default to first available
      if (!this.languages.some(l => l.code === this.targetLang) && this.languages.length > 0) {
        this.targetLang = this.languages[0].code;
      }
    } catch (err: any) {
      console.warn('Failed to fetch provider languages, using fallback list:', err);
      this.languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
      ];
    }
  }

  private setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + Enter or Cmd + Enter translates immediately
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.executeTranslation();
      }
      // Escape closes modal or drawer
      if (e.key === 'Escape') {
        if (this.activeModal) this.closeModal();
        if (this.activeDrawer) this.closeDrawer();
      }
    });
  }

  private onSourceChange(text: string) {
    this.sourceText = text;
    this.errorMessage = undefined;

    if (!text.trim()) {
      this.translatedText = '';
      this.detectedLang = undefined;
      this.updateTranslationUI();
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Auto-translate with 550ms debounce
    this.debounceTimer = window.setTimeout(() => {
      this.executeTranslation();
    }, 550);
  }

  private async executeTranslation() {
    if (!this.sourceText.trim()) return;

    this.isTranslating = true;
    this.errorMessage = undefined;
    this.updateTranslationUI();

    try {
      const res = await api.translate({
        text: this.sourceText,
        source_lang: this.sourceLang,
        target_lang: this.targetLang,
        provider_id: this.currentProviderId,
      });

      this.translatedText = res.translated_text;
      this.detectedLang = res.detected_source_lang;
      
      // Refresh history in background
      this.history = await api.getHistory();
    } catch (err: any) {
      console.error('Translation error:', err);
      const msg = err?.message || err?.toString() || 'Failed to translate text';
      this.errorMessage = msg;
    } finally {
      this.isTranslating = false;
      this.updateTranslationUI();
    }
  }

  private onSwapLanguages() {
    if (this.sourceLang === 'auto') return;

    const tempLang = this.sourceLang;
    this.sourceLang = this.targetLang;
    this.targetLang = tempLang;

    const tempText = this.sourceText;
    this.sourceText = this.translatedText;
    this.translatedText = tempText;

    this.render();
    if (this.sourceText.trim()) {
      this.executeTranslation();
    }
  }

  private openSettings() {
    if (this.activeModal) this.closeModal();

    const modal = createSettingsModal({
      providers: this.providers,
      activeProviderId: this.currentProviderId,
      onSave: async (payload: ProviderConfigPayload) => {
        try {
          await api.saveProviderConfig(payload);
          this.currentProviderId = payload.provider_id;
          this.providers = await api.getProviders();
          await this.loadLanguages();
          this.errorMessage = undefined;
          this.render();
          if (this.sourceText.trim()) {
            this.executeTranslation();
          }
        } catch (err: any) {
          alert(`Failed to save configuration: ${err?.message || err}`);
        }
      },
      onClose: () => this.closeModal(),
    });

    this.activeModal = modal;
    document.body.appendChild(modal);
  }

  private closeModal() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }

  private openHistory() {
    if (this.activeDrawer) this.closeDrawer();

    const drawer = createHistoryDrawer({
      history: this.history,
      onSelectItem: (item: HistoryItem) => {
        this.sourceText = item.source_text;
        this.translatedText = item.translated_text;
        this.sourceLang = item.source_lang;
        this.targetLang = item.target_lang;
        this.render();
      },
      onClearHistory: async () => {
        await api.clearHistory();
        this.history = [];
        this.render();
      },
      onClose: () => this.closeDrawer(),
    });

    this.activeDrawer = drawer;
    document.body.appendChild(drawer);
  }

  private closeDrawer() {
    if (this.activeDrawer) {
      this.activeDrawer.remove();
      this.activeDrawer = null;
    }
  }

  private updateTranslationUI() {
    const targetTextarea = this.container.querySelector('#target-textarea') as HTMLTextAreaElement | null;
    const targetCharCounter = this.container.querySelector('#target-char-counter') as HTMLElement | null;
    const statusIndicator = this.container.querySelector('#translation-status-indicator') as HTMLElement | null;
    const bannerContainer = this.container.querySelector('#status-banner-container') as HTMLElement | null;

    if (targetTextarea) {
      targetTextarea.value = this.translatedText;
      targetTextarea.placeholder = this.isTranslating ? 'Translating...' : 'Translation will appear here...';
    }

    if (targetCharCounter) {
      targetCharCounter.innerHTML = `
        ${this.detectedLang ? `Detected: <strong>${this.detectedLang.toUpperCase()}</strong> &bull; ` : ''}
        ${this.translatedText.length} characters
      `;
    }

    if (statusIndicator) {
      statusIndicator.textContent = this.isTranslating ? '⏳ Translating...' : 'Ready';
    }

    if (bannerContainer) {
      if (this.errorMessage) {
        bannerContainer.innerHTML = `
          <div class="status-banner error">
            <span>⚠️ ${this.errorMessage}</span>
            <button id="banner-action-btn">Configure Provider</button>
          </div>
        `;
        bannerContainer.querySelector('#banner-action-btn')?.addEventListener('click', () => this.openSettings());
      } else {
        bannerContainer.innerHTML = '';
      }
    }
  }

  private render() {
    this.container.innerHTML = '';

    const currentProvider = this.providers.find(p => p.id === this.currentProviderId);
    const providerName = currentProvider ? currentProvider.name : 'LibreTranslate';

    // Header
    const header = createHeader({
      currentProviderName: providerName,
      isDark: this.isDark,
      onToggleTheme: () => this.toggleTheme(),
      onOpenSettings: () => this.openSettings(),
      onOpenHistory: () => this.openHistory(),
    });

    // Translation Box
    const translationBox = createTranslationBox({
      languages: this.languages,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang,
      sourceText: this.sourceText,
      translatedText: this.translatedText,
      detectedLang: this.detectedLang,
      isTranslating: this.isTranslating,
      errorMessage: this.errorMessage,
      onSourceChange: (text) => this.onSourceChange(text),
      onSourceLangChange: (lang) => {
        this.sourceLang = lang;
        if (this.sourceText.trim()) this.executeTranslation();
      },
      onTargetLangChange: (lang) => {
        this.targetLang = lang;
        if (this.sourceText.trim()) this.executeTranslation();
      },
      onSwapLanguages: () => this.onSwapLanguages(),
      onClearSource: () => {
        this.sourceText = '';
        this.translatedText = '';
        this.detectedLang = undefined;
        this.updateTranslationUI();
      },
      onOpenSettings: () => this.openSettings(),
    });

    this.container.appendChild(header);
    this.container.appendChild(translationBox);
  }
}

// Mount application
document.addEventListener('DOMContentLoaded', () => {
  new LibreLingoApp('app');
});
