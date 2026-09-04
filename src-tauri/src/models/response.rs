use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResponse {
    pub translated_text: String,
    pub detected_source_lang: Option<String>,
    pub provider_used: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedLanguage {
    pub language: String,
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageInfo {
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub requires_api_key: bool,
    pub has_configured_key: bool,
    pub allows_custom_url: bool,
    pub custom_url: Option<String>,
    pub default_url: Option<String>,
}
