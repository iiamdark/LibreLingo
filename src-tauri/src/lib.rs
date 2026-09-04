pub mod commands;
pub mod error;
pub mod models;
pub mod providers;
pub mod storage;

use commands::{
    clear_history, detect_language, get_history, get_providers, get_supported_languages,
    remove_provider_key, save_provider_config, translate_text,
};
use providers::ProviderRegistry;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let registry = Arc::new(ProviderRegistry::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(registry)
        .invoke_handler(tauri::generate_handler![
            translate_text,
            detect_language,
            get_supported_languages,
            get_providers,
            save_provider_config,
            remove_provider_key,
            get_history,
            clear_history
        ])
        .run(tauri::generate_context!())
        .expect("Error while running LibreLingo application");
}
