use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::TranslationProvider;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const DEFAULT_LIBRETRANSLATE_URL: &str = "https://translate.argosopentech.com";

pub struct LibreTranslateProvider {
    client: Client,
}

impl LibreTranslateProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .unwrap_or_default();
        Self { client }
    }

    fn resolve_url<'a>(&self, custom_url: Option<&'a str>) -> &'a str {
        match custom_url {
            Some(url) if !url.trim().is_empty() => url.trim().trim_end_matches('/'),
            _ => DEFAULT_LIBRETRANSLATE_URL,
        }
    }
}

#[derive(Serialize)]
struct LtTranslatePayload<'a> {
    q: &'a str,
    source: &'a str,
    target: &'a str,
    format: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key: Option<&'a str>,
}

#[derive(Deserialize)]
struct LtDetectedLanguageInner {
    confidence: Option<f32>,
    language: String,
}

#[derive(Deserialize)]
struct LtTranslateResponse {
    #[serde(rename = "translatedText")]
    translated_text: Option<String>,
    #[serde(rename = "detectedLanguage")]
    detected_language: Option<LtDetectedLanguageInner>,
    error: Option<String>,
}

#[derive(Serialize)]
struct LtDetectPayload<'a> {
    q: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key: Option<&'a str>,
}

#[derive(Deserialize)]
struct LtLanguageItem {
    code: String,
    name: String,
}

#[async_trait]
impl TranslationProvider for LibreTranslateProvider {
    fn id(&self) -> &'static str {
        "libretranslate"
    }

    fn name(&self) -> &'static str {
        "LibreTranslate (Open Source)"
    }

    fn description(&self) -> &'static str {
        "100% open-source machine translation. Works with public instances or your own self-hosted local server."
    }

    fn requires_api_key(&self) -> bool {
        false
    }

    fn allows_custom_url(&self) -> bool {
        true
    }

    fn default_url(&self) -> Option<&'static str> {
        Some(DEFAULT_LIBRETRANSLATE_URL)
    }

    async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<TranslationResponse, AppError> {
        let endpoint = format!("{}/translate", self.resolve_url(base_url));
        let payload = LtTranslatePayload {
            q: &req.text,
            source: if req.source_lang == "auto" { "auto" } else { &req.source_lang },
            target: &req.target_lang,
            format: "text",
            api_key: api_key.filter(|k| !k.trim().is_empty()),
        };

        let res = self.client.post(&endpoint)
            .json(&payload)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let error_text = res.text().await.unwrap_or_default();
            if status.as_u16() == 429 {
                return Err(AppError::RateLimit("Rate limit reached on LibreTranslate instance. Please wait a moment or configure your own local instance in Settings.".into()));
            }
            if status.as_u16() == 403 || status.as_u16() == 401 {
                return Err(AppError::Auth(format!("This LibreTranslate instance requires a valid API Key. Details: {}", error_text)));
            }
            return Err(AppError::Provider(format!("LibreTranslate responded with HTTP {}: {}", status, error_text)));
        }

        let body: LtTranslateResponse = res.json().await?;
        if let Some(err) = body.error {
            return Err(AppError::Provider(err));
        }

        let translated = body.translated_text.ok_or_else(|| {
            AppError::Provider("Server response does not contain translated text".into())
        })?;

        let detected_lang = body.detected_language.map(|d| d.language);

        Ok(TranslationResponse {
            translated_text: translated,
            detected_source_lang: detected_lang,
            provider_used: self.name().to_string(),
        })
    }

    async fn detect_language(
        &self,
        text: &str,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<DetectedLanguage, AppError> {
        let endpoint = format!("{}/detect", self.resolve_url(base_url));
        let payload = LtDetectPayload {
            q: text,
            api_key: api_key.filter(|k| !k.trim().is_empty()),
        };

        let res = self.client.post(&endpoint)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(AppError::Provider(format!("Failed to detect language with LibreTranslate: HTTP {}", res.status())));
        }

        let items: Vec<LtDetectedLanguageInner> = res.json().await?;
        let first = items.into_iter().next().ok_or_else(|| {
            AppError::Provider("Could not detect source language".into())
        })?;

        Ok(DetectedLanguage {
            language: first.language,
            confidence: first.confidence,
        })
    }

    async fn get_supported_languages(&self, base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError> {
        let endpoint = format!("{}/languages", self.resolve_url(base_url));
        let res = self.client.get(&endpoint).send().await?;

        if !res.status().is_success() {
            // Fallback to standard language list if endpoint is unreachable
            return Ok(get_fallback_languages());
        }

        let items: Vec<LtLanguageItem> = res.json().await
            .unwrap_or_else(|_| get_fallback_languages_lt());

        let mut list: Vec<LanguageInfo> = items
            .into_iter()
            .map(|i| LanguageInfo { code: i.code, name: i.name })
            .collect();

        list.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(list)
    }
}

fn get_fallback_languages_lt() -> Vec<LtLanguageItem> {
    get_fallback_languages()
        .into_iter()
        .map(|l| LtLanguageItem { code: l.code, name: l.name })
        .collect()
}

pub fn get_fallback_languages() -> Vec<LanguageInfo> {
    vec![
        LanguageInfo { code: "en".into(), name: "English".into() },
        LanguageInfo { code: "es".into(), name: "Spanish".into() },
        LanguageInfo { code: "fr".into(), name: "French".into() },
        LanguageInfo { code: "de".into(), name: "German".into() },
        LanguageInfo { code: "it".into(), name: "Italian".into() },
        LanguageInfo { code: "pt".into(), name: "Portuguese".into() },
        LanguageInfo { code: "ru".into(), name: "Russian".into() },
        LanguageInfo { code: "zh".into(), name: "Chinese (Simplified)".into() },
        LanguageInfo { code: "ja".into(), name: "Japanese".into() },
        LanguageInfo { code: "ar".into(), name: "Arabic".into() },
        LanguageInfo { code: "hi".into(), name: "Hindi".into() },
        LanguageInfo { code: "ko".into(), name: "Korean".into() },
        LanguageInfo { code: "nl".into(), name: "Dutch".into() },
        LanguageInfo { code: "pl".into(), name: "Polish".into() },
        LanguageInfo { code: "uk".into(), name: "Ukrainian".into() },
    ]
}
