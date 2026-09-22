from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    ADMIN_SIGNUP_CODE: str 

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
