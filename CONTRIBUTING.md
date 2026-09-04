# Contributing to LibreLingo

Thank you for your interest in contributing to **LibreLingo**! LibreLingo is a community-driven open-source desktop translator built with **Rust**, **Tauri v2**, and modern web technologies.

We welcome all kinds of contributions: new translation provider adapters, bug fixes, UI/UX polish, translations, and documentation improvements.

---

## 🛠️ Development Setup

### Prerequisites

1. **Rust & Cargo**: Install via [rustup.rs](https://rustup.rs/):
   ```bash
   # On Windows (PowerShell):
   winget install Rustlang.Rustup
   # Or download rustup-init.exe from https://rustup.rs
   ```
   Ensure you have the C++ build tools installed (Visual Studio C++ Build Tools on Windows, or GCC on Linux).
2. **Node.js**: Version 18+ or 20+ (with `npm`):
   ```bash
   node --version
   npm --version
   ```
3. **OS-specific dependencies**:
   - **Windows**: Microsoft Edge WebView2 (pre-installed on Windows 10 & 11).
   - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libsecret-1-dev`.
   - **macOS**: Xcode Command Line Tools.

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/iiamdark/LibreLingo.git
   cd librelingo
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   # Starts the Vite frontend + compiles and launches the Rust Tauri desktop window
   npm run tauri dev
   ```
   *(Alternatively, you can test the frontend UI in your browser without compiling the Rust backend by running `npm run dev`)*.

---

## 🧩 How to Add a New Translation Provider

LibreLingo uses the **Strategy / Adapter Pattern**. Adding a new provider (e.g. Google Translate, Microsoft Translator, OpenAI, Ollama/Local LLM, etc.) takes just 3 simple steps:

### Step 1: Create the Provider Adapter

Create a new file in `src-tauri/src/providers/<your_provider>.rs`:

```rust
use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::TranslationProvider;
use async_trait::async_trait;
use reqwest::Client;

pub struct MyNewProvider {
    client: Client,
}

impl MyNewProvider {
    pub fn new() -> Self {
        Self { client: Client::new() }
    }
}

#[async_trait]
impl TranslationProvider for MyNewProvider {
    fn id(&self) -> &'static str {
        "my_provider" // Unique provider identifier
    }

    fn name(&self) -> &'static str {
        "My Translation Service" // Human-readable name shown in UI
    }

    fn description(&self) -> &'static str {
        "Short description of what this provider offers."
    }

    fn requires_api_key(&self) -> bool {
        true // Or false if it is a free/no-key provider
    }

    fn allows_custom_url(&self) -> bool {
        false // True if users can configure custom endpoints (e.g. self-hosted)
    }

    fn default_url(&self) -> Option<&'static str> {
        None
    }

    async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<TranslationResponse, AppError> {
        // 1. Validate API key or endpoint
        // 2. Perform HTTP request via self.client
        // 3. Return TranslationResponse
        Ok(TranslationResponse {
            translated_text: "Translated text".into(),
            detected_source_lang: Some("en".into()),
            provider_used: self.name().to_string(),
        })
    }

    async fn detect_language(
        &self,
        text: &str,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<DetectedLanguage, AppError> {
        // Implement language detection
        Ok(DetectedLanguage {
            language: "en".into(),
            confidence: Some(1.0),
        })
    }

    async fn get_supported_languages(&self, base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError> {
        // Return list of supported languages
        Ok(vec![
            LanguageInfo { code: "en".into(), name: "English".into() },
            LanguageInfo { code: "es".into(), name: "Spanish".into() },
        ])
    }
}
```

### Step 2: Register the Provider

In `src-tauri/src/providers/mod.rs`:
1. Add `pub mod <your_provider>;`
2. In `ProviderRegistry::new()`, register your provider:
   ```rust
   registry.register(Arc::new(MyNewProvider::new()));
   ```

### Step 3: Test and Verify

1. Run `npm run build` to verify frontend type safety.
2. Run `cargo test --manifest-path src-tauri/Cargo.toml` to verify backend compilation.
3. Launch `npm run tauri dev` and open the **Settings** modal to configure and test your new provider!

---

## 🔒 Security Best Practices

- **Never commit secrets, credentials, or API keys** to the repository.
- API keys in LibreLingo must always be handled via `crate::storage::keyring` which delegates directly to the native OS vault (`Windows Credential Manager`, `macOS Keychain`, `libsecret`).
- Always validate incoming inputs and handle network timeouts/rate limits with user-friendly error messages.

---

## 📝 Pull Request Guidelines

1. Fork the repository and create a descriptive branch: `git checkout -b feature/add-provider-xyz`.
2. Follow Rust idioms and run linter/formatter:
   ```bash
   cargo fmt --manifest-path src-tauri/Cargo.toml
   cargo clippy --manifest-path src-tauri/Cargo.toml
   ```
3. Verify that the frontend builds without errors:
   ```bash
   npm run build
   ```
4. Write clear, semantic commit messages (e.g., `feat: add Google Translate adapter`, `fix: handle 429 rate limit in LibreTranslate`).
5. Submit your Pull Request against the `main` branch.

Thank you for helping make LibreLingo better for everyone! 🚀

