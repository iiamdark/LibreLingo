# Changelog

All notable changes to the **LibreLingo** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
