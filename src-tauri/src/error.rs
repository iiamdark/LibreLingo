use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Network or connection error: {0}")]
    Network(String),

    #[error("Authentication error or invalid API key: {0}")]
    Auth(String),

    #[error("Rate limit or quota exceeded: {0}")]
    RateLimit(String),

    #[error("Translation provider error: {0}")]
    Provider(String),

    #[error("Secure credential storage error: {0}")]
    SecureStorage(String),

    #[error("Invalid input or bad request: {0}")]
    InvalidInput(String),

    #[error("Internal system error: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            AppError::Network("Connection timed out while reaching the translation server".to_string())
        } else if err.is_connect() {
            AppError::Network(format!("Failed to connect to the translation server: {}", err))
        } else if let Some(status) = err.status() {
            match status.as_u16() {
                401 | 403 => AppError::Auth("Invalid, unauthorized, or missing API key".to_string()),
                429 => AppError::RateLimit("Rate limit exceeded for this provider".to_string()),
                500..=599 => AppError::Provider(format!("The translation server returned an error (HTTP {})", status)),
                _ => AppError::Provider(format!("Unexpected response from provider (HTTP {})", status)),
            }
        } else {
            AppError::Network(err.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Provider(format!("Failed to parse JSON response: {}", err))
    }
}
