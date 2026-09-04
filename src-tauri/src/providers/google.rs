use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::TranslationProvider;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub struct GoogleTranslateProvider {
    client: Client,
}

impl GoogleTranslateProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self { client }
    }
}

#[async_trait]
impl TranslationProvider for GoogleTranslateProvider {
    fn id(&self) -> &'static str {
        "google"
    }

    fn name(&self) -> &'static str {
        "Google Translate (Free Web)"
    }

    fn description(&self) -> &'static str {
        "Instant translation with zero configuration. No API key required."
    }

    fn requires_api_key(&self) -> bool {
        false
    }

    fn allows_custom_url(&self) -> bool {
        false
    }

    fn default_url(&self) -> Option<&'static str> {
        None
    }

    async fn translate(
        &self,
        req: &TranslationRequest,
        _api_key: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<TranslationResponse, AppError> {
        let sl = if req.source_lang == "auto" { "auto" } else { &req.source_lang };
        let url = format!(
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
            sl,
            req.target_lang,
            urlencoding::encode(&req.text)
        );

        let res = self.client.get(&url).send().await?;
        if !res.status().is_success() {
            return Err(AppError::Provider(format!("Google Translate returned HTTP {}", res.status())));
        }

        let json: Value = res.json().await?;

        // Format is: [[[ "translated_chunk", "source_chunk", ... ]], null, "detected_lang", ...]
        let mut translated_text = String::new();
        if let Some(sentences) = json.get(0).and_then(|v| v.as_array()) {
            for sentence in sentences {
                if let Some(chunk) = sentence.get(0).and_then(|v| v.as_str()) {
                    translated_text.push_str(chunk);
                }
            }
        }

        let detected_lang = json.get(2).and_then(|v| v.as_str()).map(|s| s.to_string());

        if translated_text.is_empty() {
            translated_text = req.text.clone();
        }

        Ok(TranslationResponse {
            translated_text,
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
        let req = TranslationRequest {
            text: text.to_string(),
            source_lang: "auto".to_string(),
            target_lang: "en".to_string(),
            provider_id: self.id().to_string(),
        };

        let resp = self.translate(&req, api_key, base_url).await?;
        Ok(DetectedLanguage {
            language: resp.detected_source_lang.unwrap_or_else(|| "en".to_string()),
            confidence: Some(0.99),
        })
    }

    async fn get_supported_languages(&self, _base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError> {
        Ok(vec![
            LanguageInfo { code: "en".into(), name: "English".into() },
            LanguageInfo { code: "es".into(), name: "Spanish".into() },
            LanguageInfo { code: "fr".into(), name: "French".into() },
            LanguageInfo { code: "de".into(), name: "German".into() },
            LanguageInfo { code: "it".into(), name: "Italian".into() },
            LanguageInfo { code: "pt".into(), name: "Portuguese".into() },
            LanguageInfo { code: "ru".into(), name: "Russian".into() },
            LanguageInfo { code: "zh".into(), name: "Chinese (Simplified)".into() },
            LanguageInfo { code: "ja".into(), name: "Japanese".into() },
            LanguageInfo { code: "ko".into(), name: "Korean".into() },
            LanguageInfo { code: "ar".into(), name: "Arabic".into() },
            LanguageInfo { code: "hi".into(), name: "Hindi".into() },
            LanguageInfo { code: "nl".into(), name: "Dutch".into() },
            LanguageInfo { code: "pl".into(), name: "Polish".into() },
            LanguageInfo { code: "tr".into(), name: "Turkish".into() },
            LanguageInfo { code: "uk".into(), name: "Ukrainian".into() },
            LanguageInfo { code: "sv".into(), name: "Swedish".into() },
            LanguageInfo { code: "el".into(), name: "Greek".into() },
        ])
    }
}
