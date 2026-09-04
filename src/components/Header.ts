export interface HeaderProps {
  currentProviderName: string;
  isDark: boolean;
  isPinned: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenFileTranslator: () => void;
  onOpenVocabulary: () => void;
  onOpenGlossary: () => void;
  onTogglePin: () => void;
}

export function createHeader(props: HeaderProps): HTMLElement {
  const header = document.createElement('header');
  header.className = 'app-header';

  header.innerHTML = `
    <div class="brand-section">
      <div class="brand-logo" title="LibreLingo">LL</div>
      <div>
        <span class="brand-title">LibreLingo</span>
        <span class="brand-badge">Open Source</span>
      </div>
    </div>
    <div class="header-actions">
      <!-- Active Provider Pill -->
      <div class="provider-pill" id="provider-badge-btn" title="Configure translation provider">
        <span class="provider-dot"></span>
        <span id="current-provider-label">${props.currentProviderName}</span>
      </div>

      <div class="header-divider"></div>

      <!-- File & Subtitle Translator -->
      <button class="icon-btn" id="files-btn" title="Translate Documents & Subtitles (.srt, .vtt, .txt)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </button>

      <!-- Vocabulary / Anki Deck Drawer -->
      <button class="icon-btn" id="vocab-btn" title="Saved Vocabulary & Anki Deck Export">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <!-- Custom Glossary Rules Modal -->
      <button class="icon-btn" id="glossary-btn" title="Custom Glossary & Terminology Rules">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </button>

      <!-- Translation History Drawer -->
      <button class="icon-btn" id="history-toggle-btn" title="Translation history">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>

      <div class="header-divider"></div>

      <!-- Pin to Top -->
      <button class="icon-btn ${props.isPinned ? 'active-pin' : ''}" id="pin-toggle-btn" title="${props.isPinned ? 'Unpin window from top' : 'Always keep window on top'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${props.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17z"></path>
        </svg>
      </button>

      <!-- Dark / Light Theme Toggle -->
      <button class="icon-btn" id="theme-toggle-btn" title="Toggle dark/light mode">
        <svg id="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${props.isDark ? getSunSvg() : getMoonSvg()}
        </svg>
      </button>

      <!-- Settings Modal Toggle -->
      <button class="icon-btn" id="settings-toggle-btn" title="Provider & API settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="3" r="3"></circle>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  `;

  header.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
    props.onToggleTheme();
    const iconContainer = header.querySelector('#theme-icon');
    const isNowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (iconContainer) {
      iconContainer.innerHTML = isNowDark ? getSunSvg() : getMoonSvg();
    }
  });

  header.querySelector('#settings-toggle-btn')?.addEventListener('click', props.onOpenSettings);
  header.querySelector('#provider-badge-btn')?.addEventListener('click', props.onOpenSettings);
  header.querySelector('#history-toggle-btn')?.addEventListener('click', props.onOpenHistory);
  header.querySelector('#files-btn')?.addEventListener('click', props.onOpenFileTranslator);
  header.querySelector('#vocab-btn')?.addEventListener('click', props.onOpenVocabulary);
  header.querySelector('#glossary-btn')?.addEventListener('click', props.onOpenGlossary);
  header.querySelector('#pin-toggle-btn')?.addEventListener('click', props.onTogglePin);

  return header;
}

function getSunSvg(): string {
  return `
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  `;
}

function getMoonSvg(): string {
  return `
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  `;
}
