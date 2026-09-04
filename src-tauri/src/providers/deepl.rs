use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::TranslationProvider;
use async_trait::async_trait;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub struct DeepLProvider {
    client: Client,
}

impl DeepLProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .unwrap_or_default();
        Self { client }
    }

    fn resolve_endpoint(&self, api_key: &str) -> &'static str {
        if api_key.trim().ends_with(":fx") {
            "https://api-free.deepl.com/v2"
        } else {
            "https://api.deepl.com/v2"
        }
    }
}

#[derive(Serialize)]
struct DeepLTranslatePayload<'a> {
    text: Vec<&'a str>,
    target_lang: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_lang: Option<String>,
}

#[derive(Deserialize)]
struct DeepLTranslationItem {
    detected_source_language: Option<String>,
    text: String,
}

#[derive(Deserialize)]
struct DeepLResponse {
    translations: Vec<DeepLTranslationItem>,
}

#[async_trait]
impl TranslationProvider for DeepLProvider {
    fn id(&self) -> &'static str {
        "deepl"
    }

    fn name(&self) -> &'static str {
        "DeepL Translator (API)"
    }

    fn description(&self) -> &'static str {
        "Industry-leading neural translation quality. Requires a free or Pro DeepL API key (500k characters/month free)."
    }

    fn requires_api_key(&self) -> bool {
        true
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
        api_key: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<TranslationResponse, AppError> {
        let key = api_key
            .map(str::trim)
            .filter(|k| !k.is_empty())
            .ok_or_else(|| AppError::Auth("DeepL requires an API Key. Please configure it in Settings.".into()))?;

        let base_endpoint = self.resolve_endpoint(key);
        let url = format!("{}/translate", base_endpoint);

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("DeepL-Auth-Key {}", key))
                .map_err(|e| AppError::InvalidInput(e.to_string()))?,
        );

        let source_lang = if req.source_lang == "auto" {
            None
        } else {
            Some(req.source_lang.to_uppercase())
        };

        let payload = DeepLTranslatePayload {
            text: vec![&req.text],
            target_lang: req.target_lang.to_uppercase(),
            source_lang,
        };

        let res = self.client.post(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await?;

        let status = res.status();
        if !status.is_success() {
            let error_text = res.text().await.unwrap_or_default();
            if status.as_u16() == 403 || status.as_u16() == 401 {
                return Err(AppError::Auth("DeepL API key is invalid or has expired.".into()));
            }
            if status.as_u16() == 456 {
                return Err(AppError::RateLimit("Quota exceeded for your DeepL account.".into()));
            }
            if status.as_u16() == 429 {
                return Err(AppError::RateLimit("Too many requests sent to DeepL. Please wait a moment.".into()));
            }
            return Err(AppError::Provider(format!("DeepL returned HTTP {}: {}", status, error_text)));
        }

        let body: DeepLResponse = res.json().await?;
        let first = body.translations.into_iter().next().ok_or_else(|| {
            AppError::Provider("DeepL did not return any translation for the provided text".into())
        })?;

        Ok(TranslationResponse {
            translated_text: first.text,
            detected_source_lang: first.detected_source_language.map(|s| s.to_lowercase()),
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
        let lang = resp.detected_source_lang.unwrap_or_else(|| "en".to_string());
        
        Ok(DetectedLanguage {
            language: lang,
            confidence: Some(0.95),
        })
    }

    async fn get_supported_languages(&self, _base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError> {
        Ok(vec![
            LanguageInfo { code: "bg".into(), name: "Bulgarian".into() },
            LanguageInfo { code: "cs".into(), name: "Czech".into() },
            LanguageInfo { code: "da".into(), name: "Danish".into() },
            LanguageInfo { code: "de".into(), name: "German".into() },
            LanguageInfo { code: "el".into(), name: "Greek".into() },
            LanguageInfo { code: "en".into(), name: "English".into() },
            LanguageInfo { code: "es".into(), name: "Spanish".into() },
            LanguageInfo { code: "et".into(), name: "Estonian".into() },
            LanguageInfo { code: "fi".into(), name: "Finnish".into() },
            LanguageInfo { code: "fr".into(), name: "French".into() },
            LanguageInfo { code: "hu".into(), name: "Hungarian".into() },
            LanguageInfo { code: "id".into(), name: "Indonesian".into() },
            LanguageInfo { code: "it".into(), name: "Italian".into() },
            LanguageInfo { code: "ja".into(), name: "Japanese".into() },
            LanguageInfo { code: "ko".into(), name: "Korean".into() },
            LanguageInfo { code: "lt".into(), name: "Lithuanian".into() },
            LanguageInfo { code: "lv".into(), name: "Latvian".into() },
            LanguageInfo { code: "nb".into(), name: "Norwegian".into() },
            LanguageInfo { code: "nl".into(), name: "Dutch".into() },
            LanguageInfo { code: "pl".into(), name: "Polish".into() },
            LanguageInfo { code: "pt".into(), name: "Portuguese".into() },
            LanguageInfo { code: "ro".into(), name: "Romanian".into() },
            LanguageInfo { code: "ru".into(), name: "Russian".into() },
            LanguageInfo { code: "sk".into(), name: "Slovak".into() },
            LanguageInfo { code: "sl".into(), name: "Slovenian".into() },
            LanguageInfo { code: "sv".into(), name: "Swedish".into() },
            LanguageInfo { code: "tr".into(), name: "Turkish".into() },
            LanguageInfo { code: "uk".into(), name: "Ukrainian".into() },
            LanguageInfo { code: "zh".into(), name: "Chinese".into() },
        ])
    }
}
