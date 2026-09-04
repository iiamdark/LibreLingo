use crate::error::AppError;
use crate::models::HistoryItem;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub custom_urls: HashMap<String, String>,
    pub default_provider: Option<String>,
    pub auto_detect: bool,
    pub last_source_lang: Option<String>,
    pub last_target_lang: Option<String>,
}

fn get_app_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = PathBuf::from(appdata).join("LibreLingo");
        let _ = fs::create_dir_all(&path);
        path
    } else if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join(".config").join("librelingo");
        let _ = fs::create_dir_all(&path);
        path
    } else {
        let path = std::env::temp_dir().join("librelingo");
        let _ = fs::create_dir_all(&path);
        path
    }
}

fn get_history_file_path() -> PathBuf {
    get_app_dir().join("history.json")
}

fn get_config_file_path() -> PathBuf {
    get_app_dir().join("config.json")
}

pub fn load_history() -> Result<Vec<HistoryItem>, AppError> {
    let path = get_history_file_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| AppError::Internal(format!("Failed to read translation history: {}", e)))?;
    
    let history: Vec<HistoryItem> = serde_json::from_str(&content)
        .unwrap_or_default();
    
    Ok(history)
}

pub fn save_history(history: &[HistoryItem]) -> Result<(), AppError> {
    let path = get_history_file_path();
    let content = serde_json::to_string_pretty(history)
        .map_err(|e| AppError::Internal(format!("Failed to serialize history: {}", e)))?;
    
    fs::write(&path, content)
        .map_err(|e| AppError::Internal(format!("Failed to write history to disk: {}", e)))?;
    
    Ok(())
}

pub fn add_history_item(item: HistoryItem) -> Result<(), AppError> {
    let mut history = load_history()?;
    // Keep max 100 entries, most recent first
    history.insert(0, item);
    if history.len() > 100 {
        history.truncate(100);
    }
    save_history(&history)
}

pub fn clear_history() -> Result<(), AppError> {
    save_history(&[])
}

pub fn load_config() -> AppConfig {
    let path = get_config_file_path();
    if !path.exists() {
        return AppConfig::default();
    }

    fs::read_to_string(&path)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

pub fn save_config(config: &AppConfig) -> Result<(), AppError> {
    let path = get_config_file_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| AppError::Internal(format!("Failed to serialize configuration: {}", e)))?;
    
    fs::write(&path, content)
        .map_err(|e| AppError::Internal(format!("Failed to write configuration to disk: {}", e)))?;
    
    Ok(())
}

pub fn set_custom_url(provider_id: &str, url: Option<String>) -> Result<(), AppError> {
    let mut config = load_config();
    if let Some(custom_url) = url {
        if custom_url.trim().is_empty() {
            config.custom_urls.remove(provider_id);
        } else {
            config.custom_urls.insert(provider_id.to_string(), custom_url.trim().to_string());
        }
    } else {
        config.custom_urls.remove(provider_id);
    }
    save_config(&config)
}

pub fn get_custom_url(provider_id: &str) -> Option<String> {
    let config = load_config();
    config.custom_urls.get(provider_id).cloned()
}
