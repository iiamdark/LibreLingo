use crate::error::AppError;
use crate::models::{ProviderConfigPayload, ProviderMetadata};
use crate::providers::ProviderRegistry;
use crate::storage::{delete_api_key, set_custom_url, store_api_key};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_providers(
    registry: State<'_, Arc<ProviderRegistry>>,
) -> Result<Vec<ProviderMetadata>, AppError> {
    Ok(registry.list_metadata())
}

#[tauri::command]
pub async fn save_provider_config(
    payload: ProviderConfigPayload,
) -> Result<(), AppError> {
    // Save API key if provided
    if let Some(key) = payload.api_key {
        let trimmed = key.trim();
        if trimmed.is_empty() {
            let _ = delete_api_key(&payload.provider_id);
        } else {
            store_api_key(&payload.provider_id, trimmed)?;
        }
    }

    // Save custom endpoint URL (e.g. for self-hosted LibreTranslate)
    set_custom_url(&payload.provider_id, payload.custom_url)?;

    Ok(())
}

#[tauri::command]
pub async fn remove_provider_key(
    provider_id: String,
) -> Result<(), AppError> {
    delete_api_key(&provider_id)
}
