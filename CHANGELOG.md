# Changelog

All notable changes to the **LibreLingo** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-09-04

### Added
- **Productivity & Desktop UX**:
  - **Always On Top (Pin Window)**: Quick pin-to-top window toggling (`Alt + P` or Header pin icon) powered by Tauri window APIs.
  - **Compact Spotlight Mode**: Clean, distraction-free floating mode (`Alt + M`) tailored for quick lookups alongside other desktop apps.
  - **Instant Clipboard Translation**: Quick action chip and shortcut (`Alt + C`) to instantly read and translate system clipboard contents.
- **Document & Subtitle Translation**:
  - **Subtitle Parser (`.srt`, `.vtt`)**: Complete timecode, cue index, and formatting preservation engine with batching support (`subtitleParser.ts`).
  - **Document Translator Modal**: Drag-and-drop file translation (`FileTranslatorModal.ts`) supporting `.srt`, `.vtt`, `.txt`, `.md`, `.json`, `.csv` with real-time translation progress bar and one-click file download.
- **Screen Capture & OCR**:
  - **Image Paste & Drag-and-Drop**: Direct screenshot paste (`Ctrl + V`) and image drop into the translation workspace.
  - **Vision AI OCR Engine**: Multimodal optical character recognition (`ocr-service.ts`) powered by Gemini 2.0 Flash via OpenRouter.
- **Learning & Personalization**:
  - **Saved Vocabulary & Anki Export**: Star bookmarking for saved words/sentences with full slide-over drawer (`VocabularyDrawer.ts`) and Anki flashcard deck export (`.tsv`).
  - **Custom Glossary & Terminology Rules**: Custom terminology substitution engine (`glossary.ts` & `GlossaryModal.ts`) with word-boundary regex and case-sensitivity controls.
  - **Formality / Tone Selector**: Segmented tone control (`Default`, `Formal`, `Casual`) for fine-grained translation register.
- **Design System & Aesthetics**:
  - Custom animated glowing scrollbars (6px slim, Midnight Gallery aesthetic with Iris Gleam hover glow).
  - Searchable animated dropdown menus with smooth chevron rotations.
  - Strict vector SVG icons across all controls (zero emojis).

---

## [0.2.0] - 2026-09-04

### Added
- **OpenRouter AI Provider**: Added AI-powered translation provider (`openrouter.rs`) supporting top-tier LLMs (Google Gemini 2.0 Flash Lite, Meta Llama 3.3, OpenAI GPT-4o-mini, Anthropic Claude 3.5 Haiku) with user-configurable model names and API keys.
- **Google Translate Free Web Provider**: Added zero-configuration web provider (`google.rs`) allowing instant translation out of the box with zero API keys.
- **Live Browser Translation Preview**: Updated `tauri-api.ts` so developers testing via `npm run dev` in a standard web browser experience live, real-time translations instead of static placeholder mocks.
- **Dynamic Settings UI**: Enhanced `SettingsModal.ts` to support model selection for OpenRouter and custom instance URLs for LibreTranslate.

### Changed
- Refactored `ProviderRegistry` in Rust to dynamically list and prioritize four distinct translation engines: Google Translate, LibreTranslate, DeepL, and OpenRouter AI.
- Updated documentation and README architecture diagrams to include OpenRouter and Google Translate.

---

## [0.1.0] - 2026-09-04

### Added
- **Core Architecture**: Initial release of LibreLingo built on Rust and Tauri v2.
- **Strategy / Adapter Pattern**: Created the extensible `TranslationProvider` trait.
- **LibreTranslate Provider**: 100% open-source translation engine with self-hosted Docker and public server support.
- **DeepL API Provider**: High-precision neural translation with support for Free (`:fx`) and Pro API keys.
- **OS Keyring Security**: Integrated `keyring-rs` to store API keys securely inside the Windows Credential Manager and native OS vaults.
- **Modern User Interface**: Dual-pane translation interface with auto-detect, instant language swap, character counters, and copy-to-clipboard feedback.
- **Dark & Light Themes**: Fluent design system with automatic OS theme detection and persistent manual toggle.
- **Translation History**: Local history drawer with timestamp tracking, reload-on-click, and wipe capabilities.
- **CI/CD Pipelines**: GitHub Actions workflows for automated cross-platform builds and releases.
- **Documentation**: Comprehensive README, architecture diagrams, and CONTRIBUTING guide.
