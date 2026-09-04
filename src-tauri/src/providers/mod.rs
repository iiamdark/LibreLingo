pub mod deepl;
pub mod libretranslate;

use crate::error::AppError;
use crate::models::{DetectedLanguage, LanguageInfo, ProviderMetadata, TranslationRequest, TranslationResponse};
use crate::storage::{get_api_key, get_custom_url};
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;

pub use deepl::DeepLProvider;
pub use libretranslate::LibreTranslateProvider;

/// Strategy pattern interface that all translation providers must implement.
#[async_trait]
pub trait TranslationProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn requires_api_key(&self) -> bool;
    fn allows_custom_url(&self) -> bool;
    fn default_url(&self) -> Option<&'static str>;

    async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<TranslationResponse, AppError>;

    async fn detect_language(
        &self,
        text: &str,
        api_key: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<DetectedLanguage, AppError>;

    async fn get_supported_languages(&self, base_url: Option<&str>) -> Result<Vec<LanguageInfo>, AppError>;
}

/// Registry holding active translation provider implementations.
pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn TranslationProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            providers: HashMap::new(),
        };

        // Register default providers
        registry.register(Arc::new(LibreTranslateProvider::new()));
        registry.register(Arc::new(DeepLProvider::new()));

        registry
    }

    pub fn register(&mut self, provider: Arc<dyn TranslationProvider>) {
        self.providers.insert(provider.id().to_string(), provider);
    }

    pub fn get(&self, id: &str) -> Result<Arc<dyn TranslationProvider>, AppError> {
        self.providers
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::InvalidInput(format!("Unknown translation provider: '{}'", id)))
    }

    pub fn list_metadata(&self) -> Vec<ProviderMetadata> {
        let mut list: Vec<ProviderMetadata> = self.providers
            .values()
            .map(|p| {
                let id = p.id();
                let has_configured_key = get_api_key(id).ok().flatten().is_some();
                let custom_url = get_custom_url(id);

                ProviderMetadata {
                    id: id.to_string(),
                    name: p.name().to_string(),
                    description: p.description().to_string(),
                    requires_api_key: p.requires_api_key(),
                    has_configured_key,
                    allows_custom_url: p.allows_custom_url(),
                    custom_url,
                    default_url: p.default_url().map(String::from),
                }
            })
            .collect();

        // Ensure LibreTranslate is ranked first by default
        list.sort_by(|a, b| {
            if a.id == "libretranslate" {
                std::cmp::Ordering::Less
            } else if b.id == "libretranslate" {
                std::cmp::Ordering::Greater
            } else {
                a.name.cmp(&b.name)
            }
        });

        list
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
