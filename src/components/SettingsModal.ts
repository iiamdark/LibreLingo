import { ProviderConfigPayload, ProviderMetadata } from '../services/tauri-api';

export interface SettingsModalProps {
  providers: ProviderMetadata[];
  activeProviderId: string;
  onSave: (payload: ProviderConfigPayload) => Promise<void>;
  onClose: () => void;
}

export function createSettingsModal(props: SettingsModalProps): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  let selectedProviderId = props.activeProviderId;
  const currentMeta = props.providers.find(p => p.id === selectedProviderId) || props.providers[0];

  backdrop.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">Provider & API Settings</h2>
        <button class="icon-btn" id="modal-close-btn" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Provider Selection -->
        <div class="form-group">
          <label class="form-label" for="provider-select">Active Translation Provider</label>
          <select id="provider-select" class="form-select">
            ${props.providers.map(p => `
              <option value="${p.id}" ${p.id === selectedProviderId ? 'selected' : ''}>
                ${p.name} ${p.requires_api_key ? '(Key Required)' : '(Free/Optional Key)'}
              </option>
            `).join('')}
          </select>
          <span class="form-hint" id="provider-desc">${currentMeta?.description || ''}</span>
        </div>

        <!-- Dynamic Fields Container -->
        <div id="dynamic-fields">
          ${renderProviderFields(currentMeta)}
        </div>

        <!-- Security Badge -->
        <div class="security-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <div>
            <strong>Secure Cryptographic Storage:</strong> API keys are never saved in plain text in config files. They are encrypted and stored directly in your operating system's native vault (<em>Windows Credential Manager / OS Keyring</em>).
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-save-btn">Save Changes</button>
      </div>
    </div>
  `;

  function renderProviderFields(meta?: ProviderMetadata): string {
    if (!meta) return '';

    let html = '';

    if (meta.allows_custom_url) {
      html += `
        <div class="form-group">
          <label class="form-label" for="custom-url-input">Server Endpoint URL (LibreTranslate Instance)</label>
          <input
            type="url"
            id="custom-url-input"
            class="form-input"
            placeholder="${meta.default_url || 'https://translate.argosopentech.com'}"
            value="${meta.custom_url || ''}"
          />
          <span class="form-hint">
            Leave blank to use the default free public instance, or enter your self-hosted Docker/local URL (e.g. <code>http://localhost:5000</code>).
          </span>
        </div>
      `;
    }

    html += `
      <div class="form-group">
        <label class="form-label" for="api-key-input">
          API Key ${meta.requires_api_key ? '<span style="color: var(--error)">* Required</span>' : '(Optional)'}
        </label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="api-key-input"
            class="form-input"
            style="width: 100%; padding-right: 40px;"
            placeholder="${meta.has_configured_key ? '•••••••••••••••••••••••• (Key saved securely)' : 'Paste your API key here'}"
          />
          <button type="button" id="toggle-key-visibility" class="icon-btn" style="position: absolute; right: 4px;" title="Show/hide key">
            👁️
          </button>
        </div>
        <span class="form-hint">
          ${meta.id === 'deepl' 
            ? 'For DeepL Free accounts, the key ends with <code>:fx</code> (e.g., <code>xxxx-xxxx:fx</code>). DeepL Pro keys do not have a suffix.' 
            : 'If your LibreTranslate server requires authentication, enter the API key here.'}
        </span>
      </div>
    `;

    return html;
  }

  // Provider change listener
  const providerSelect = backdrop.querySelector('#provider-select') as HTMLSelectElement;
  const descEl = backdrop.querySelector('#provider-desc') as HTMLElement;
  const dynamicFields = backdrop.querySelector('#dynamic-fields') as HTMLElement;

  providerSelect.addEventListener('change', () => {
    selectedProviderId = providerSelect.value;
    const meta = props.providers.find(p => p.id === selectedProviderId);
    if (meta && descEl) {
      descEl.textContent = meta.description;
    }
    if (dynamicFields) {
      dynamicFields.innerHTML = renderProviderFields(meta);
      attachVisibilityToggle();
    }
  });

  function attachVisibilityToggle() {
    const toggleBtn = backdrop.querySelector('#toggle-key-visibility');
    const keyInput = backdrop.querySelector('#api-key-input') as HTMLInputElement;
    toggleBtn?.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
      } else {
        keyInput.type = 'password';
      }
    });
  }

  attachVisibilityToggle();

  // Close listeners
  backdrop.querySelector('#modal-close-btn')?.addEventListener('click', props.onClose);
  backdrop.querySelector('#modal-cancel-btn')?.addEventListener('click', props.onClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) props.onClose();
  });

  // Save listener
  backdrop.querySelector('#modal-save-btn')?.addEventListener('click', async () => {
    const keyInput = backdrop.querySelector('#api-key-input') as HTMLInputElement | null;
    const urlInput = backdrop.querySelector('#custom-url-input') as HTMLInputElement | null;

    const payload: ProviderConfigPayload = {
      provider_id: selectedProviderId,
      api_key: keyInput && keyInput.value.trim() ? keyInput.value.trim() : undefined,
      custom_url: urlInput ? urlInput.value.trim() : undefined,
    };

    await props.onSave(payload);
    props.onClose();
  });

  return backdrop;
}
