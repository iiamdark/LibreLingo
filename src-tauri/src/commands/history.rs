use crate::error::AppError;
use crate::models::HistoryItem;
use crate::storage::{clear_history as clear_storage_history, load_history};

#[tauri::command]
pub async fn get_history() -> Result<Vec<HistoryItem>, AppError> {
    load_history()
}

#[tauri::command]
pub async fn clear_history() -> Result<(), AppError> {
    clear_storage_history()
}

