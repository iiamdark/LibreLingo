import { LanguageInfo } from '../services/tauri-api';
import { createAnimatedDropdown, DropdownOption } from './AnimatedDropdown';
import { isItemSaved, addVocabularyItem, removeVocabularyItem, getVocabulary } from '../services/vocabulary';
import { extractTextFromImage } from '../services/ocr-service';

export interface TranslationBoxProps {
  languages: LanguageInfo[];
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translatedText: string;
  detectedLang?: string;
  isTranslating: boolean;
  errorMessage?: string;
  formality?: 'default' | 'formal' | 'informal';
  onSourceChange: (text: string) => void;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  onSwapLanguages: () => void;
  onClearSource: () => void;
  onOpenSettings: () => void;
  onFormalityChange?: (formality: 'default' | 'formal' | 'informal') => void;
  onTranslateClipboard?: () => void;
}

export function createTranslationBox(props: TranslationBoxProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'translator-wrapper';

  // Build source options with Auto-detect option
  const sourceOptions: DropdownOption[] = [
    { code: 'auto', name: 'Auto-detect language', isAuto: true },
    ...props.languages.map(l => ({ code: l.code, name: l.name }))
  ];

  // Build target options
  const targetOptions: DropdownOption[] = props.languages.map(l => ({
    code: l.code,
    name: l.name
  }));

  const currentFormality = props.formality || 'default';
  const isSaved = isItemSaved(props.sourceText, props.targetLang);

  container.innerHTML = `
    <!-- Controls / Animated Dropdowns Bar -->
    <div class="controls-bar">
      <div class="lang-select-group">
        <div class="lang-dropdown-slot" id="source-dropdown-slot"></div>

        <button class="swap-btn" id="swap-lang-btn" title="Swap languages">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 5h18"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 19H3"></path>
          </svg>
        </button>

        <div class="lang-dropdown-slot" id="target-dropdown-slot"></div>
      </div>

      <!-- Formality / Tone Selector -->
      <div class="formality-control" title="Adjust translation tone and formality">
        <span class="formality-label">Tone</span>
        <div class="formality-chips">
          <button class="formality-chip ${currentFormality === 'default' ? 'active' : ''}" data-tone="default">Default</button>
          <button class="formality-chip ${currentFormality === 'formal' ? 'active' : ''}" data-tone="formal">Formal</button>
          <button class="formality-chip ${currentFormality === 'informal' ? 'active' : ''}" data-tone="informal">Casual</button>
        </div>
      </div>
    </div>

    <!-- Workspace Panes -->
    <div class="translation-workspace">
      <!-- Source Pane -->
      <div class="pane" id="source-pane">
        <div class="pane-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pane-label">Source Text</span>
            <span class="ocr-badge" id="ocr-tip-badge" title="You can paste (Ctrl+V) screenshots or drag-and-drop images here for AI OCR">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              OCR Ready
            </span>
          </div>
          <div class="pane-actions">
            <button class="action-chip" id="clear-text-btn" title="Clear text">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear
            </button>
          </div>
        </div>
        <div class="pane-content" style="position: relative;">
          <textarea
            id="source-textarea"
            class="trans-textarea"
            placeholder="Type, paste text, or paste screenshot (Ctrl + V) here to translate... (Ctrl + Enter to translate immediately)"
            spellcheck="true"
          >${props.sourceText}</textarea>
          <div id="ocr-overlay" class="ocr-overlay" style="display: none;">
            <svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <span>Transcribing text from image...</span>
          </div>
        </div>
        <div class="pane-footer">
          <span class="char-counter" id="source-char-counter">${props.sourceText.length} characters</span>
          <div class="pane-actions">
            <button class="action-chip" id="paste-btn" title="Paste from clipboard">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              Paste
            </button>
            <button class="action-chip" id="clip-translate-btn" title="Instant clipboard translate">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Clip
            </button>
          </div>
        </div>
      </div>

      <!-- Target Pane -->
      <div class="pane" id="target-pane">
        <div class="pane-header">
          <span class="pane-label">Translation</span>
          <div class="pane-actions">
            <!-- Bookmark / Vocabulary Button -->
            <button class="action-chip ${isSaved ? 'favorited' : ''}" id="fav-trans-btn" title="${isSaved ? 'Remove from Saved Vocabulary' : 'Save to Vocabulary (Anki export)'}">
              <svg id="fav-icon" width="13" height="13" viewBox="0 0 24 24" fill="${isSaved ? 'var(--color-iris-gleam)' : 'none'}" stroke="${isSaved ? 'var(--color-iris-gleam)' : 'currentColor'}" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span id="fav-text">${isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <!-- Copy Button -->
            <button class="action-chip" id="copy-trans-btn" title="Copy to clipboard">
              <svg id="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span id="copy-text">Copy</span>
            </button>
          </div>
        </div>
        <div class="pane-content">
          <textarea
            id="target-textarea"
            class="trans-textarea"
            placeholder="${props.isTranslating ? 'Translating...' : 'Translation will appear here...'}"
            readonly
          >${props.translatedText}</textarea>
        </div>
        <div class="pane-footer">
          <span class="char-counter" id="target-char-counter">
            ${props.detectedLang ? `Detected: <strong>${props.detectedLang.toUpperCase()}</strong> &bull; ` : ''}
            ${props.translatedText.length} characters
          </span>
          <span id="translation-status-indicator" class="status-indicator">
            ${props.isTranslating ? `
              <svg class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg> Translating...
            ` : 'Ready'}
          </span>
        </div>
      </div>
    </div>

    <!-- Error/Notice Banner -->
    <div id="status-banner-container">
      ${props.errorMessage ? `
        <div class="status-banner error">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>${props.errorMessage}</span>
          </div>
          <button id="banner-action-btn">Configure Provider</button>
        </div>
      ` : ''}
    </div>
  `;

  // Mount source animated dropdown
  const sourceSlot = container.querySelector('#source-dropdown-slot') as HTMLElement;
  const sourceDropdown = createAnimatedDropdown({
    id: 'source-lang-dropdown',
    options: sourceOptions,
    selectedCode: props.sourceLang,
    onSelect: (code) => {
      props.onSourceLangChange(code);
    }
  });
  sourceSlot.appendChild(sourceDropdown);

  // Mount target animated dropdown
  const targetSlot = container.querySelector('#target-dropdown-slot') as HTMLElement;
  const targetDropdown = createAnimatedDropdown({
    id: 'target-lang-dropdown',
    options: targetOptions,
    selectedCode: props.targetLang,
    onSelect: (code) => {
      props.onTargetLangChange(code);
    }
  });
  targetSlot.appendChild(targetDropdown);

  // Event handlers
  const sourceTextarea = container.querySelector('#source-textarea') as HTMLTextAreaElement;
  const swapBtn = container.querySelector('#swap-lang-btn') as HTMLButtonElement;
  const clearBtn = container.querySelector('#clear-text-btn') as HTMLButtonElement;
  const pasteBtn = container.querySelector('#paste-btn') as HTMLButtonElement;
  const clipTranslateBtn = container.querySelector('#clip-translate-btn') as HTMLButtonElement;
  const copyBtn = container.querySelector('#copy-trans-btn') as HTMLButtonElement;
  const favBtn = container.querySelector('#fav-trans-btn') as HTMLButtonElement;
  const sourceCharCounter = container.querySelector('#source-char-counter') as HTMLElement;
  const bannerActionBtn = container.querySelector('#banner-action-btn') as HTMLButtonElement;
  const ocrOverlay = container.querySelector('#ocr-overlay') as HTMLElement;
  const sourcePane = container.querySelector('#source-pane') as HTMLElement;

  sourceTextarea.addEventListener('input', () => {
    sourceCharCounter.textContent = `${sourceTextarea.value.length} characters`;
    updateFavButtonState();
    props.onSourceChange(sourceTextarea.value);
  });

  swapBtn.addEventListener('click', () => {
    if (props.sourceLang !== 'auto') {
      props.onSwapLanguages();
    }
  });

  clearBtn.addEventListener('click', () => {
    sourceTextarea.value = '';
    sourceCharCounter.textContent = '0 characters';
    props.onClearSource();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      sourceTextarea.value = text;
      sourceCharCounter.textContent = `${text.length} characters`;
      props.onSourceChange(text);
    } catch {
      sourceTextarea.focus();
    }
  });

  clipTranslateBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sourceTextarea.value = text;
        sourceCharCounter.textContent = `${text.length} characters`;
        props.onSourceChange(text);
      }
    } catch {
      sourceTextarea.focus();
    }
  });

  copyBtn.addEventListener('click', async () => {
    const targetTextarea = container.querySelector('#target-textarea') as HTMLTextAreaElement;
    if (!targetTextarea.value) return;

    try {
      await navigator.clipboard.writeText(targetTextarea.value);
      copyBtn.classList.add('copied');
      const copyText = copyBtn.querySelector('#copy-text');
      if (copyText) copyText.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        if (copyText) copyText.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  });

  // Formality tone chips
  container.querySelectorAll('.formality-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.formality-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tone = chip.getAttribute('data-tone') as 'default' | 'formal' | 'informal';
      props.onFormalityChange?.(tone);
    });
  });

  // Favorite / Bookmark Vocabulary Button
  function updateFavButtonState() {
    const currentSaved = isItemSaved(sourceTextarea.value, props.targetLang);
    const favText = favBtn.querySelector('#fav-text');
    const favIcon = favBtn.querySelector('#fav-icon');

    if (currentSaved) {
      favBtn.classList.add('favorited');
      if (favText) favText.textContent = 'Saved';
      favIcon?.setAttribute('fill', 'var(--color-iris-gleam)');
      favIcon?.setAttribute('stroke', 'var(--color-iris-gleam)');
    } else {
      favBtn.classList.remove('favorited');
      if (favText) favText.textContent = 'Save';
      favIcon?.setAttribute('fill', 'none');
      favIcon?.setAttribute('stroke', 'currentColor');
    }
  }

  favBtn.addEventListener('click', () => {
    const targetTextarea = container.querySelector('#target-textarea') as HTMLTextAreaElement;
    if (!sourceTextarea.value.trim() || !targetTextarea.value.trim()) return;

    const currentSaved = isItemSaved(sourceTextarea.value, props.targetLang);
    if (currentSaved) {
      const items = getVocabulary();
      const existing = items.find(i => i.sourceText.trim() === sourceTextarea.value.trim() && i.targetLang === props.targetLang);
      if (existing) {
        removeVocabularyItem(existing.id);
      }
    } else {
      addVocabularyItem(
        sourceTextarea.value,
        targetTextarea.value,
        props.sourceLang,
        props.targetLang
      );
    }
    updateFavButtonState();
  });

  // OCR Screenshot / Image Paste Handler
  sourceTextarea.addEventListener('paste', async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageOcr(file);
        }
        return;
      }
    }
  });

  // OCR Drag & Drop on Source Pane
  sourcePane.addEventListener('dragover', (e) => {
    e.preventDefault();
    sourcePane.classList.add('ocr-drag-over');
  });

  sourcePane.addEventListener('dragleave', () => {
    sourcePane.classList.remove('ocr-drag-over');
  });

  sourcePane.addEventListener('drop', async (e) => {
    e.preventDefault();
    sourcePane.classList.remove('ocr-drag-over');
    if (e.dataTransfer?.files.length) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        await handleImageOcr(file);
      }
    }
  });

  async function handleImageOcr(fileOrBlob: Blob) {
    ocrOverlay.style.display = 'flex';
    try {
      const text = await extractTextFromImage(fileOrBlob);
      if (text) {
        sourceTextarea.value = text;
        sourceCharCounter.textContent = `${text.length} characters`;
        props.onSourceChange(text);
      }
    } catch (err: any) {
      console.error('OCR failed:', err);
    } finally {
      ocrOverlay.style.display = 'none';
    }
  }

  bannerActionBtn?.addEventListener('click', props.onOpenSettings);

  return container;
}
