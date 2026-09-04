export interface HeaderProps {
  currentProviderName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function createHeader(props: HeaderProps): HTMLElement {
  const header = document.createElement('header');
  header.className = 'app-header';

  header.innerHTML = `
    <div class="brand-section">
      <div class="brand-logo">LL</div>
      <div>
        <span class="brand-title">LibreLingo</span>
        <span class="brand-badge">Open Source</span>
      </div>
    </div>
    <div class="header-actions">
      <div class="provider-pill" id="provider-badge-btn" title="Configure translation provider">
        <span class="provider-dot"></span>
        <span id="current-provider-label">${props.currentProviderName}</span>
      </div>
      <button class="icon-btn" id="history-toggle-btn" title="Translation history">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>
      <button class="icon-btn" id="theme-toggle-btn" title="Toggle dark/light mode">
        <svg id="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${props.isDark ? getSunSvg() : getMoonSvg()}
        </svg>
      </button>
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
