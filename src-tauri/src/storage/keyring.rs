use crate::error::AppError;
use keyring::Entry;

const SERVICE_NAME: &str = "org.librelingo.app";

pub fn store_api_key(provider_id: &str, api_key: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| AppError::SecureStorage(format!("Failed to initialize credential entry: {}", e)))?;
    
    entry.set_password(api_key)
        .map_err(|e| AppError::SecureStorage(format!("Failed to securely save API key in OS credential manager: {}", e)))?;
    
    Ok(())
}

pub fn get_api_key(provider_id: &str) -> Result<Option<String>, AppError> {
    let entry = Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| AppError::SecureStorage(format!("Failed to initialize credential entry: {}", e)))?;
    
    match entry.get_password() {
        Ok(pwd) => Ok(Some(pwd)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::SecureStorage(format!("Failed to retrieve secure API key: {}", e))),
    }
}

pub fn delete_api_key(provider_id: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, provider_id)
        .map_err(|e| AppError::SecureStorage(format!("Failed to initialize credential entry: {}", e)))?;
    
    match entry.delete_password() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::SecureStorage(format!("Failed to delete secure API key: {}", e))),
    }
}
