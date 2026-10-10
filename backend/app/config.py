from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'sqlite:///./leadpilot.db'
    app_env: str = 'development'
    allowed_origins: str = 'http://localhost:3000,http://127.0.0.1:3000'
    cookie_secure: bool = False
    ai_mode: str = 'rules'
    ai_api_key: str = ''
    ai_base_url: str = 'https://api.openai.com/v1'
    ai_model: str = 'gpt-4.1-mini'
    allow_live_ai: bool = False
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
if settings.app_env == 'production' and not settings.cookie_secure:
    raise RuntimeError('Production requires COOKIE_SECURE=true and HTTPS')
