use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::TranslationProvider;
use async_trait::async_trait;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

pub const DEFAULT_OPENROUTER_MODEL: &str = "google/gemini-2.0-flash-lite-001";
pub const OPENROUTER_ENDPOINT: &str = "https://openrouter.ai/api/v1/chat/completions";

pub struct OpenRouterProvider {
    client: Client,
}

impl OpenRouterProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(20))
            .build()
            .unwrap_or_default();
        Self { client }
    }

    fn resolve_model<'a>(&self, custom_model: Option<&'a str>) -> &'a str {
        match custom_model {
            Some(m) if !m.trim().is_empty() => m.trim(),
            _ => DEFAULT_OPENROUTER_MODEL,
        }
    }
}

#[derive(Deserialize)]
struct OpenRouterMessage {
    content: String,
}

#[derive(Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterMessage,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Option<Vec<OpenRouterChoice>>,
    error: Option<OpenRouterErrorDetail>,
}

#[derive(Deserialize)]
struct OpenRouterErrorDetail {
    message: String,
}

#[async_trait]
impl TranslationProvider for OpenRouterProvider {
    fn id(&self) -> &'static str {
        "openrouter"
    }

    fn name(&self) -> &'static str {
        "OpenRouter AI (LLM)"
    }

    fn description(&self) -> &'static str {
        "AI-powered translation via OpenRouter (Gemini, Llama 3, Claude, GPT-4o). Requires an OpenRouter API key."
    }

    fn requires_api_key(&self) -> bool {
        true
    }

    fn allows_custom_url(&self) -> bool {
        true // Used as custom Model identifier (e.g. google/gemini-2.0-flash-lite-001)
    }

    fn default_url(&self) -> Option<&'static str> {
        Some(DEFAULT_OPENROUTER_MODEL)
    }

    async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: Option<&str>,
        custom_model: Option<&str>,
    ) -> Result<TranslationResponse, AppError> {
        let key = api_key
            .map(str::trim)
            .filter(|k| !k.is_empty())
            .ok_or_else(|| AppError::Auth("OpenRouter requires an API Key (starts with sk-or-v1-...). Please configure it in Settings.".into()))?;

        let model = self.resolve_model(custom_model);

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", key))
                .map_err(|e| AppError::InvalidInput(e.to_string()))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert("HTTP-Referer", HeaderValue::from_static("https://github.com/iiamdark/LibreLingo"));
        headers.insert("X-Title", HeaderValue::from_static("LibreLingo Desktop"));

        let system_prompt = format!(
            "You are a professional, accurate translator. Translate the given text into target language code '{}'. Maintain the exact original tone, meaning, formatting, and casing. Output ONLY the raw translated text with NO explanations, NO quotes, and NO commentary.",
            req.target_lang
        );

        let user_prompt = if req.source_lang == "auto" {
            format!("Translate the following text into '{}':\n\n{}", req.target_lang, req.text)
        } else {
            format!("Translate the following text from '{}' into '{}':\n\n{}", req.source_lang, req.target_lang, req.text)
        };

        let body = json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.2
        });

        let res = self.client.post(OPENROUTER_ENDPOINT)
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let error_text = res.text().await.unwrap_or_default();
            if status.as_u16() == 401 {
                return Err(AppError::Auth("OpenRouter API key is invalid or unauthorized.".into()));
            }
            if status.as_u16() == 402 {
                return Err(AppError::RateLimit("OpenRouter balance insufficient. Please add credits to your account.".into()));
            }
            if status.as_u16() == 429 {
                return Err(AppError::RateLimit("OpenRouter rate limit exceeded. Please wait a moment.".into()));
            }
            return Err(AppError::Provider(format!("OpenRouter responded with HTTP {}: {}", status, error_text)));
        }

        let resp: OpenRouterResponse = res.json().await?;
        if let Some(err) = resp.error {
            return Err(AppError::Provider(err.message));
        }

        let first = resp.choices.and_then(|c| c.into_iter().next()).ok_or_else(|| {
            AppError::Provider("OpenRouter returned an empty completion list".into())
        })?;

        let translated = first.message.content.trim().to_string();

        Ok(TranslationResponse {
            translated_text: translated,
            detected_source_lang: if req.source_lang == "auto" { None } else { Some(req.source_lang.clone()) },
            provider_used: format!("OpenRouter ({})", model),
        })
    }

    async fn detect_language(
        &self,
        text: &str,
        api_key: Option<&str>,
        custom_model: Option<&str>,
    ) -> Result<DetectedLanguage, AppError> {
        let key = api_key
            .map(str::trim)
            .filter(|k| !k.is_empty())
            .ok_or_else(|| AppError::Auth("OpenRouter requires an API key for language detection.".into()))?;

        let model = self.resolve_model(custom_model);

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", key))
                .map_err(|e| AppError::InvalidInput(e.to_string()))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let body = json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "Detect the ISO 639-1 two-letter language code of the user text. Output ONLY the two-letter code (e.g. en, es, fr, de, ja, zh)."
                },
                { "role": "user", "content": text }
            ],
            "temperature": 0.0
        });

        let res = self.client.post(OPENROUTER_ENDPOINT)
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(AppError::Provider("Failed to detect language with OpenRouter".into()));
        }

        let resp: OpenRouterResponse = res.json().await?;
        let code = resp.choices
            .and_then(|c| c.into_iter().next())
            .map(|c| c.message.content.trim().to_lowercase())
            .unwrap_or_else(|| "en".to_string());

        Ok(DetectedLanguage {
            language: code,
            confidence: Some(0.98),
        })
    }

    async fn get_supported_languages(&self, _base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError> {
        // LLMs support practically every world language
        Ok(vec![
            LanguageInfo { code: "en".into(), name: "English".into() },
            LanguageInfo { code: "es".into(), name: "Spanish".into() },
            LanguageInfo { code: "fr".into(), name: "French".into() },
            LanguageInfo { code: "de".into(), name: "German".into() },
            LanguageInfo { code: "it".into(), name: "Italian".into() },
            LanguageInfo { code: "pt".into(), name: "Portuguese".into() },
            LanguageInfo { code: "zh".into(), name: "Chinese (Simplified)".into() },
            LanguageInfo { code: "ja".into(), name: "Japanese".into() },
            LanguageInfo { code: "ko".into(), name: "Korean".into() },
            LanguageInfo { code: "ru".into(), name: "Russian".into() },
            LanguageInfo { code: "ar".into(), name: "Arabic".into() },
            LanguageInfo { code: "hi".into(), name: "Hindi".into() },
            LanguageInfo { code: "nl".into(), name: "Dutch".into() },
            LanguageInfo { code: "pl".into(), name: "Polish".into() },
            LanguageInfo { code: "tr".into(), name: "Turkish".into() },
            LanguageInfo { code: "uk".into(), name: "Ukrainian".into() },
            LanguageInfo { code: "sv".into(), name: "Swedish".into() },
            LanguageInfo { code: "el".into(), name: "Greek".into() },
            LanguageInfo { code: "vi".into(), name: "Vietnamese".into() },
            LanguageInfo { code: "th".into(), name: "Thai".into() },
        ])
    }
}
