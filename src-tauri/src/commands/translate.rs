use crate::error::AppError;
use crate::models::{DetectedLanguage, HistoryItem, LanguageInfo, TranslationRequest, TranslationResponse};
use crate::providers::ProviderRegistry;
use crate::storage::{add_history_item, get_api_key, get_custom_url};
use chrono::Utc;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn translate_text(
    registry: State<'_, Arc<ProviderRegistry>>,
    req: TranslationRequest,
) -> Result<TranslationResponse, AppError> {
    if req.text.trim().is_empty() {
        return Ok(TranslationResponse {
            translated_text: String::new(),
            detected_source_lang: None,
            provider_used: req.provider_id,
        });
    }

    let provider = registry.get(&req.provider_id)?;
    let api_key = get_api_key(&req.provider_id).ok().flatten();
    let custom_url = get_custom_url(&req.provider_id);

    let response = provider
        .translate(&req, api_key.as_deref(), custom_url.as_deref())
        .await?;

    // Auto-save translation in local history
    let history_item = HistoryItem {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        source_text: req.text.clone(),
        translated_text: response.translated_text.clone(),
        source_lang: response.detected_source_lang.clone().unwrap_or(req.source_lang),
        target_lang: req.target_lang,
        provider_id: req.provider_id,
    };
    let _ = add_history_item(history_item);

    Ok(response)
}

#[tauri::command]
pub async fn detect_language(
    registry: State<'_, Arc<ProviderRegistry>>,
    provider_id: String,
    text: String,
) -> Result<DetectedLanguage, AppError> {
    if text.trim().is_empty() {
        return Ok(DetectedLanguage {
            language: "en".to_string(),
            confidence: None,
        });
    }

    let provider = registry.get(&provider_id)?;
    let api_key = get_api_key(&provider_id).ok().flatten();
    let custom_url = get_custom_url(&provider_id);

    provider
        .detect_language(&text, api_key.as_deref(), custom_url.as_deref())
        .await
}

#[tauri::command]
pub async fn get_supported_languages(
    registry: State<'_, Arc<ProviderRegistry>>,
    provider_id: String,
) -> Result<Vec<LanguageInfo>, AppError> {
    let provider = registry.get(&provider_id)?;
    let custom_url = get_custom_url(&provider_id);
    provider.get_supported_languages(custom_url.as_deref()).await
}

