import {
  getGlossaryTerms,
  addGlossaryTerm,
  removeGlossaryTerm
} from '../services/glossary';

export interface GlossaryModalProps {
  onClose: () => void;
  onGlossaryUpdated?: () => void;
}

export function createGlossaryModal(props: GlossaryModalProps): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  let terms = getGlossaryTerms();

  function renderTermsList(container: HTMLElement) {
    if (terms.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="height: 140px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <p>No glossary rules yet. Add terms above to enforce specific translations.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="glossary-table">
        <div class="glossary-header-row">
          <span>Source Term</span>
          <span></span>
          <span>Target Term</span>
          <span style="text-align: center;">Case</span>
          <span style="text-align: right;">Action</span>
        </div>
        ${terms.map(t => `
          <div class="glossary-row" data-id="${t.id}">
            <span class="glossary-badge source">${escapeHtml(t.source)}</span>
            <span class="glossary-arrow">➔</span>
            <span class="glossary-badge target">${escapeHtml(t.target)}</span>
            <span class="glossary-case-tag">${t.caseSensitive ? 'Aa' : 'Any'}</span>
            <div style="text-align: right;">
              <button class="icon-btn-sm delete-term-btn" data-id="${t.id}" title="Remove rule">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.delete-term-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          removeGlossaryTerm(id);
          terms = getGlossaryTerms();
          renderTermsList(container);
          props.onGlossaryUpdated?.();
        }
      });
    });
  }

  backdrop.innerHTML = `
    <div class="modal-content" style="max-width: 600px;" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <h2 class="modal-title">Custom Glossary & Rules</h2>
        </div>
        <button class="icon-btn" id="modal-close-btn" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <p class="form-hint" style="margin-bottom: 8px;">
          Terms defined here will automatically substitute matches in your translations, ensuring exact terminology across technical, legal, or personal workflows.
        </p>

        <!-- Add Term Inputs -->
        <div class="glossary-input-card">
          <div class="glossary-input-grid">
            <div class="form-group">
              <label class="form-label" for="glossary-src-input">Original Word / Phrase</label>
              <input type="text" id="glossary-src-input" class="form-input" placeholder="e.g. LLM" />
            </div>
            <div class="form-group">
              <label class="form-label" for="glossary-tgt-input">Desired Translation</label>
              <input type="text" id="glossary-tgt-input" class="form-input" placeholder="e.g. Modelo de Lenguaje Grande" />
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--color-ash); cursor: pointer;">
              <input type="checkbox" id="glossary-case-chk" style="accent-color: var(--color-iris-gleam);" />
              Match exact letter case
            </label>
            <button class="btn btn-primary btn-sm" id="add-glossary-btn">
              Add Term Rule
            </button>
          </div>
        </div>

        <!-- Defined Terms List -->
        <div class="form-group" style="margin-top: 6px;">
          <label class="form-label">Active Terminology Rules</label>
          <div id="glossary-list-container"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" id="glossary-done-btn">Done</button>
      </div>
    </div>
  `;

  const listContainer = backdrop.querySelector('#glossary-list-container') as HTMLElement;
  const srcInput = backdrop.querySelector('#glossary-src-input') as HTMLInputElement;
  const tgtInput = backdrop.querySelector('#glossary-tgt-input') as HTMLInputElement;
  const caseChk = backdrop.querySelector('#glossary-case-chk') as HTMLInputElement;
  const addBtn = backdrop.querySelector('#add-glossary-btn') as HTMLButtonElement;
  const doneBtn = backdrop.querySelector('#glossary-done-btn') as HTMLButtonElement;

  renderTermsList(listContainer);

  addBtn.addEventListener('click', () => {
    const src = srcInput.value.trim();
    const tgt = tgtInput.value.trim();
    if (!src || !tgt) {
      alert('Please fill out both the original term and target translation.');
      return;
    }
    addGlossaryTerm(src, tgt, caseChk.checked);
    terms = getGlossaryTerms();
    srcInput.value = '';
    tgtInput.value = '';
    caseChk.checked = false;
    renderTermsList(listContainer);
    props.onGlossaryUpdated?.();
  });

  doneBtn.addEventListener('click', props.onClose);
  backdrop.querySelector('#modal-close-btn')?.addEventListener('click', props.onClose);
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
