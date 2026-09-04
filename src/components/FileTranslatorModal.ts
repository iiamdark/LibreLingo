import { api, LanguageInfo } from '../services/tauri-api';
import { formatSrt, formatVtt, parseSrt, parseVtt } from '../utils/subtitleParser';

export interface FileTranslatorModalProps {
  languages: LanguageInfo[];
  currentProviderId: string;
  targetLang: string;
  onClose: () => void;
}

export function createFileTranslatorModal(props: FileTranslatorModalProps): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  let selectedFile: File | null = null;
  let isProcessing = false;
  let targetLang = props.targetLang;
  let translatedContent: string | null = null;
  let translatedFileName = '';

  backdrop.innerHTML = `
    <div class="modal-content" style="max-width: 620px;" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-iris-gleam)" stroke-width="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h2 class="modal-title">Document & Subtitle Translator</h2>
        </div>
        <button class="icon-btn" id="modal-close-btn" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Target Language Row -->
        <div class="form-group" style="margin-bottom: 4px;">
          <label class="form-label" for="file-target-lang">Translate Into</label>
          <select id="file-target-lang" class="form-select">
            ${props.languages.map(l => `
              <option value="${l.code}" ${l.code === targetLang ? 'selected' : ''}>
                ${l.name} (${l.code.toUpperCase()})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Drop Zone -->
        <div class="file-drop-zone" id="file-drop-zone">
          <input type="file" id="file-input" style="display: none;" accept=".srt,.vtt,.txt,.md,.json,.csv" />
          <div class="drop-zone-content" id="drop-zone-content">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-fog)" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p style="font-size: 0.95rem; font-weight: 500; color: var(--color-pure); margin-top: 8px;">
              Drag and drop your file here, or <span style="color: var(--color-iris-gleam); text-decoration: underline; cursor: pointer;">browse</span>
            </p>
            <p style="font-size: 0.78rem; color: var(--color-fog); margin-top: 4px;">
              Supported formats: <strong>.srt, .vtt (Subtitles)</strong>, .txt, .md, .json, .csv
            </p>
          </div>
        </div>

        <!-- Selected File Preview & Progress -->
        <div id="file-info-container" style="display: none;">
          <div class="selected-file-card">
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <div style="overflow: hidden;">
                <div id="selected-file-name" style="font-weight: 500; color: var(--color-pure); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"></div>
                <div id="selected-file-size" style="font-size: 0.75rem; color: var(--color-fog); font-family: var(--font-mono);"></div>
              </div>
            </div>
            <button class="action-chip" id="remove-file-btn">Change</button>
          </div>

          <div id="progress-container" style="display: none; margin-top: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 6px; font-family: var(--font-mono);">
              <span id="progress-status" style="color: var(--color-ash);">Translating content...</span>
              <span id="progress-percent" style="color: var(--color-iris-gleam); font-weight: 500;">0%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="progress-fill" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="start-translate-file-btn" disabled>
          Translate File
        </button>
        <button class="btn btn-primary" id="download-file-btn" style="display: none; background-color: var(--color-success); border-color: var(--color-success);">
          Download Translated File
        </button>
      </div>
    </div>
  `;

  // Attach handlers
  const dropZone = backdrop.querySelector('#file-drop-zone') as HTMLElement;
  const fileInput = backdrop.querySelector('#file-input') as HTMLInputElement;
  const targetSelect = backdrop.querySelector('#file-target-lang') as HTMLSelectElement;
  const fileInfoContainer = backdrop.querySelector('#file-info-container') as HTMLElement;
  const fileNameEl = backdrop.querySelector('#selected-file-name') as HTMLElement;
  const fileSizeEl = backdrop.querySelector('#selected-file-size') as HTMLElement;
  const removeFileBtn = backdrop.querySelector('#remove-file-btn') as HTMLButtonElement;
  const startBtn = backdrop.querySelector('#start-translate-file-btn') as HTMLButtonElement;
  const downloadBtn = backdrop.querySelector('#download-file-btn') as HTMLButtonElement;
  const progressContainer = backdrop.querySelector('#progress-container') as HTMLElement;
  const progressStatus = backdrop.querySelector('#progress-status') as HTMLElement;
  const progressPercent = backdrop.querySelector('#progress-percent') as HTMLElement;
  const progressFill = backdrop.querySelector('#progress-fill') as HTMLElement;

  targetSelect.addEventListener('change', () => {
    targetLang = targetSelect.value;
  });

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer?.files.length) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    translatedContent = null;
    fileInfoContainer.style.display = 'none';
    dropZone.style.display = 'block';
    startBtn.disabled = true;
    startBtn.style.display = 'inline-block';
    downloadBtn.style.display = 'none';
    progressContainer.style.display = 'none';
  });

  function handleFileSelected(file: File) {
    selectedFile = file;
    dropZone.style.display = 'none';
    fileInfoContainer.style.display = 'block';
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    startBtn.disabled = false;
  }

  startBtn.addEventListener('click', async () => {
    if (!selectedFile || isProcessing) return;
    isProcessing = true;
    startBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressFill.style.width = '5%';
    progressPercent.textContent = '5%';

    try {
      const text = await selectedFile.text();
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

      if (ext === 'srt' || ext === 'vtt') {
        const isVtt = ext === 'vtt';
        const cues = isVtt ? parseVtt(text) : parseSrt(text);
        const total = cues.length;

        progressStatus.textContent = `Translating ${total} subtitle cues...`;

        // Process in batches of 5
        const batchSize = 5;
        for (let i = 0; i < total; i += batchSize) {
          const batch = cues.slice(i, i + batchSize);
          const combined = batch.map(c => c.text).join('\n---\n');

          const res = await api.translate({
            text: combined,
            source_lang: 'auto',
            target_lang: targetLang,
            provider_id: props.currentProviderId
          });

          const translatedBatch = res.translated_text.split('\n---\n');
          for (let j = 0; j < batch.length; j++) {
            if (translatedBatch[j]) {
              batch[j].text = translatedBatch[j].trim();
            }
          }

          const pct = Math.min(95, Math.round(((i + batchSize) / total) * 100));
          progressFill.style.width = `${pct}%`;
          progressPercent.textContent = `${pct}%`;
        }

        translatedContent = isVtt ? formatVtt(cues) : formatSrt(cues);
      } else {
        // Plain text / markdown
        progressStatus.textContent = 'Translating document text...';
        progressFill.style.width = '40%';
        progressPercent.textContent = '40%';

        const res = await api.translate({
          text,
          source_lang: 'auto',
          target_lang: targetLang,
          provider_id: props.currentProviderId
        });
        translatedContent = res.translated_text;
      }

      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      progressStatus.textContent = 'Translation completed!';

      // Prepare download
      const nameParts = selectedFile.name.split('.');
      const extOnly = nameParts.pop();
      translatedFileName = `${nameParts.join('.')}.${targetLang}.${extOnly}`;

      startBtn.style.display = 'none';
      downloadBtn.style.display = 'inline-block';
    } catch (err: any) {
      alert(`Translation failed: ${err?.message || err}`);
      progressStatus.textContent = 'Failed';
      startBtn.disabled = false;
    } finally {
      isProcessing = false;
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!translatedContent) return;
    const blob = new Blob([translatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = translatedFileName;
    a.click();
    URL.revokeObjectURL(url);
    props.onClose();
  });

  // Close handlers
  backdrop.querySelector('#modal-close-btn')?.addEventListener('click', props.onClose);
  backdrop.querySelector('#modal-cancel-btn')?.addEventListener('click', props.onClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) props.onClose();
  });

  return backdrop;
}
