export interface DropdownOption {
  code: string;
  name: string;
  isAuto?: boolean;
}

export interface AnimatedDropdownProps {
  id: string;
  options: DropdownOption[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function createAnimatedDropdown(props: AnimatedDropdownProps): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'animated-dropdown-wrapper';
  wrapper.id = props.id;

  let currentSelected = props.selectedCode;
  let isOpen = false;
  let searchQuery = '';

  const getSelectedOption = () => {
    return props.options.find(o => o.code === currentSelected) || props.options[0];
  };

  const getFilteredOptions = () => {
    if (!searchQuery.trim()) return props.options;
    const q = searchQuery.toLowerCase().trim();
    return props.options.filter(o => 
      o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  };

  function renderTriggerContent(): string {
    const selected = getSelectedOption();
    const isAuto = selected?.isAuto || selected?.code === 'auto';

    return `
      <div class="dropdown-trigger-left">
        ${isAuto ? getSparkleSvg() : getGlobeSvg()}
        <span class="dropdown-selected-name">${selected?.name || 'Select language'}</span>
      </div>
      <div class="dropdown-trigger-right">
        <span class="dropdown-code-badge">${(selected?.code || '').toUpperCase()}</span>
        <svg class="dropdown-chevron ${isOpen ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    `;
  }

  function renderOptionsList(): string {
    const filtered = getFilteredOptions();
    if (filtered.length === 0) {
      return `<div class="dropdown-empty">No languages found</div>`;
    }

    return filtered.map(opt => {
      const isSelected = opt.code === currentSelected;
      return `
        <div class="dropdown-option ${isSelected ? 'selected' : ''}" data-code="${opt.code}">
          <div class="dropdown-option-left">
            ${opt.isAuto ? getSparkleSvg() : ''}
            <span>${opt.name}</span>
          </div>
          <div class="dropdown-option-right">
            <span class="dropdown-code-badge">${opt.code.toUpperCase()}</span>
            ${isSelected ? getCheckmarkSvg() : '<span class="dropdown-check-placeholder"></span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  wrapper.innerHTML = `
    <button type="button" class="dropdown-trigger-btn" aria-haspopup="listbox" aria-expanded="false">
      ${renderTriggerContent()}
    </button>
    <div class="dropdown-panel" role="listbox">
      <div class="dropdown-search-container">
        <svg class="dropdown-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="dropdown-search-input" placeholder="Search language..." />
      </div>
      <div class="dropdown-options-list">
        ${renderOptionsList()}
      </div>
    </div>
  `;

  const triggerBtn = wrapper.querySelector('.dropdown-trigger-btn') as HTMLButtonElement;
  const searchInput = wrapper.querySelector('.dropdown-search-input') as HTMLInputElement;
  const optionsListContainer = wrapper.querySelector('.dropdown-options-list') as HTMLElement;

  function toggleOpen(open?: boolean) {
    isOpen = open !== undefined ? open : !isOpen;
    triggerBtn.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      // Close other dropdowns first
      document.querySelectorAll('.animated-dropdown-wrapper.is-open').forEach(el => {
        if (el !== wrapper) {
          el.classList.remove('is-open');
          const btn = el.querySelector('.dropdown-trigger-btn');
          btn?.setAttribute('aria-expanded', 'false');
          el.querySelector('.dropdown-chevron')?.classList.remove('rotated');
        }
      });

      wrapper.classList.add('is-open');
      triggerBtn.querySelector('.dropdown-chevron')?.classList.add('rotated');
      searchQuery = '';
      searchInput.value = '';
      optionsListContainer.innerHTML = renderOptionsList();
      attachOptionClickHandlers();
      setTimeout(() => searchInput.focus(), 60);
    } else {
      wrapper.classList.remove('is-open');
      triggerBtn.querySelector('.dropdown-chevron')?.classList.remove('rotated');
    }
  }

  function attachOptionClickHandlers() {
    optionsListContainer.querySelectorAll('.dropdown-option').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.getAttribute('data-code');
        if (code) {
          currentSelected = code;
          triggerBtn.innerHTML = renderTriggerContent();
          toggleOpen(false);
          props.onSelect(code);
        }
      });
    });
  }

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleOpen();
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    optionsListContainer.innerHTML = renderOptionsList();
    attachOptionClickHandlers();
  });

  searchInput.addEventListener('click', (e) => e.stopPropagation());

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target as Node) && isOpen) {
      toggleOpen(false);
    }
  });

  // Close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      toggleOpen(false);
      triggerBtn.focus();
    }
  });

  attachOptionClickHandlers();

  return wrapper;
}

function getGlobeSvg(): string {
  return `
    <svg class="favi-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  `;
}

function getSparkleSvg(): string {
  return `
    <svg class="favi-icon sparkle" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
    </svg>
  `;
}

function getCheckmarkSvg(): string {
  return `
    <svg class="favi-icon checkmark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
}
