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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                ${p.name} ${p.requires_api_key ? '(Key Required)' : '(Free / No Key)'}
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <div>
            <strong>Secure Cryptographic Storage:</strong> API keys are never stored in plain text. When running on desktop, they are secured inside the <em>Windows Credential Manager / OS Keyring</em>.
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

    if (meta.id === 'google') {
      return `
        <div class="form-group" style="padding: 14px; background: var(--color-abyss); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 10px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span style="font-size: 0.85rem; color: var(--color-ash); line-height: 1.5;">
            <strong style="color: var(--color-pure);">Google Translate (Free Web)</strong> is ready to use out of the box with zero configuration and no API keys required.
          </span>
        </div>
      `;
    }

    let html = '';

    if (meta.id === 'openrouter') {
      html += `
        <div class="form-group">
          <label class="form-label" for="custom-url-input">AI Model Name</label>
          <input
            type="text"
            id="custom-url-input"
            class="form-input"
            placeholder="google/gemini-2.0-flash-lite-001"
            value="${meta.custom_url || 'google/gemini-2.0-flash-lite-001'}"
          />
          <span class="form-hint">
            Specify any OpenRouter model (e.g. <code>google/gemini-2.0-flash-lite-001</code>, <code>meta-llama/llama-3.3-70b-instruct:free</code>, or <code>openai/gpt-4o-mini</code>).
          </span>
        </div>
      `;
    } else if (meta.allows_custom_url) {
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
            Enter your self-hosted Docker URL (e.g. <code>http://localhost:5000</code>) or a public mirror.
          </span>
        </div>
      `;
    }

    html += `
      <div class="form-group">
        <label class="form-label" for="api-key-input">
          API Key ${meta.requires_api_key ? '<span style="color: var(--color-error)">* Required</span>' : '(Optional)'}
        </label>
        <div style="position: relative; display: flex; align-items: center;">
          <input
            type="password"
            id="api-key-input"
            class="form-input"
            style="width: 100%; padding-right: 42px;"
            placeholder="${meta.has_configured_key ? '•••••••••••••••••••••••• (Key saved securely)' : 'Paste your API key here'}"
          />
          <button type="button" id="toggle-key-visibility" class="icon-btn" style="position: absolute; right: 4px; border: none; padding: 6px;" title="Show/hide key">
            <svg id="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <span class="form-hint">
          ${meta.id === 'openrouter'
            ? 'Get an API key from <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--color-iris-gleam); text-decoration: underline;">openrouter.ai/keys</a> (starts with <code>sk-or-v1-...</code>).'
            : meta.id === 'deepl' 
            ? 'For DeepL Free accounts, the key ends with <code>:fx</code> (e.g., <code>xxxx-xxxx:fx</code>). DeepL Pro keys have no suffix.' 
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
    const eyeIcon = backdrop.querySelector('#eye-icon');
    
    toggleBtn?.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        if (eyeIcon) {
          eyeIcon.innerHTML = `
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
            <line x1="2" y1="2" x2="22" y2="22"></line>
          `;
        }
      } else {
        keyInput.type = 'password';
        if (eyeIcon) {
          eyeIcon.innerHTML = `
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          `;
        }
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
