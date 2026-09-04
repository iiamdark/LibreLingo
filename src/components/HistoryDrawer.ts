import { HistoryItem } from '../services/tauri-api';

export interface HistoryDrawerProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => Promise<void>;
  onClose: () => void;
}

export function createHistoryDrawer(props: HistoryDrawerProps): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';

  backdrop.innerHTML = `
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Translation History">
      <div class="drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h2 style="font-size: 1.1rem; font-weight: 700;">History</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${props.history.length > 0 ? `
            <button class="action-chip" id="clear-all-history-btn" title="Clear all translation history">
              Clear all
            </button>
          ` : ''}
          <button class="icon-btn" id="drawer-close-btn" title="Close drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="drawer-list" id="drawer-items-list">
        ${props.history.length === 0 ? `
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <p>No recent translations yet</p>
          </div>
        ` : props.history.map(item => `
          <div class="history-card" data-id="${item.id}" title="Click to reload this translation">
            <div class="history-card-header">
              <span>${item.source_lang.toUpperCase()} ➔ ${item.target_lang.toUpperCase()} &bull; <em>${item.provider_id}</em></span>
              <span>${formatTimestamp(item.timestamp)}</span>
            </div>
            <div class="history-card-source">${escapeHtml(item.source_text)}</div>
            <div class="history-card-target">${escapeHtml(item.translated_text)}</div>
          </div>
        `).join('')}
      </div>
    </aside>
  `;

  // Attach card click listeners
  const cards = backdrop.querySelectorAll('.history-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const item = props.history.find(h => h.id === id);
      if (item) {
        props.onSelectItem(item);
        props.onClose();
      }
    });
  });

  // Close listeners
  backdrop.querySelector('#drawer-close-btn')?.addEventListener('click', props.onClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) props.onClose();
  });

  // Clear history listener
  backdrop.querySelector('#clear-all-history-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your translation history?')) {
      await props.onClearHistory();
      props.onClose();
    }
  });

  return backdrop;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
