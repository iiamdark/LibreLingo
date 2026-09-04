import {
  getVocabulary,
  removeVocabularyItem,
  saveVocabulary,
  exportToAnkiCsv,
  VocabularyItem
} from '../services/vocabulary';

export interface VocabularyDrawerProps {
  onSelectItem: (item: VocabularyItem) => void;
  onClose: () => void;
}

export function createVocabularyDrawer(props: VocabularyDrawerProps): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';

  let items = getVocabulary();
  let searchQuery = '';

  function renderList(listContainer: HTMLElement) {
    const filtered = items.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.sourceText.toLowerCase().includes(q) ||
        item.translatedText.toLowerCase().includes(q) ||
        item.sourceLang.toLowerCase().includes(q) ||
        item.targetLang.toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>${items.length === 0 ? 'No saved vocabulary yet.<br>Click the star icon on any translation to save it!' : 'No matching terms found.'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(item => `
      <div class="vocabulary-card" data-id="${item.id}">
        <div class="vocabulary-card-header">
          <span class="vocab-lang-badge">${item.sourceLang.toUpperCase()} ➔ ${item.targetLang.toUpperCase()}</span>
          <button class="icon-btn-sm delete-vocab-btn" data-id="${item.id}" title="Remove word">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="vocabulary-card-source">${escapeHtml(item.sourceText)}</div>
        <div class="vocabulary-card-target">${escapeHtml(item.translatedText)}</div>
      </div>
    `).join('');

    // Attach click handlers to select or delete
    listContainer.querySelectorAll('.vocabulary-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.delete-vocab-btn')) return;
        const id = card.getAttribute('data-id');
        const item = items.find(i => i.id === id);
        if (item) {
          props.onSelectItem(item);
          props.onClose();
        }
      });
    });

    listContainer.querySelectorAll('.delete-vocab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          removeVocabularyItem(id);
          items = getVocabulary();
          renderList(listContainer);
          updateHeaderCount();
        }
      });
    });
  }

  backdrop.innerHTML = `
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Saved Vocabulary">
      <div class="drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h2 style="font-size: 1.1rem; font-weight: 700;">Vocabulary</h2>
          <span class="brand-badge" id="vocab-count-badge">${items.length}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="icon-btn" id="drawer-close-btn" title="Close drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Action Bar: Search & Export -->
      <div class="drawer-subbar">
        <div class="search-input-wrapper" style="flex: 1;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="vocab-search-input" class="search-input" placeholder="Search saved words..." />
        </div>
        <button class="btn-secondary btn-sm" id="export-anki-btn" title="Export deck for Anki spaced repetition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Anki (.tsv)
        </button>
      </div>

      <!-- Vocabulary Items List -->
      <div class="drawer-list" id="vocab-items-list"></div>

      ${items.length > 0 ? `
        <div class="drawer-footer">
          <button class="action-chip" id="clear-all-vocab-btn">Clear All</button>
        </div>
      ` : ''}
    </aside>
  `;

  const listContainer = backdrop.querySelector('#vocab-items-list') as HTMLElement;
  const searchInput = backdrop.querySelector('#vocab-search-input') as HTMLInputElement;
  const exportBtn = backdrop.querySelector('#export-anki-btn') as HTMLButtonElement;
  const clearAllBtn = backdrop.querySelector('#clear-all-vocab-btn') as HTMLButtonElement | null;
  const countBadge = backdrop.querySelector('#vocab-count-badge') as HTMLElement;

  function updateHeaderCount() {
    if (countBadge) {
      countBadge.textContent = `${items.length}`;
    }
  }

  renderList(listContainer);

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderList(listContainer);
  });

  exportBtn.addEventListener('click', () => {
    const csvContent = exportToAnkiCsv();
    if (!csvContent) {
      alert('Your vocabulary list is empty. Star some translations first!');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `librelingo_anki_deck_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  clearAllBtn?.addEventListener('click', () => {
    if (confirm('Clear all saved vocabulary items?')) {
      saveVocabulary([]);
      items = [];
      renderList(listContainer);
      updateHeaderCount();
    }
  });

  backdrop.querySelector('#drawer-close-btn')?.addEventListener('click', props.onClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) props.onClose();
  });

  return backdrop;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
