import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud.firestore import Client
from typing import Optional

load_dotenv()

class Settings(BaseSettings):
    # Core API Settings
    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"

    # Firebase & Google Settings (Updated to match your .env file keys)
    # The error showed these specific keys were present in your environment
    FIREBASE_SERVICE_ACCOUNT_KEY: Optional[str] = None 
    GOOGLE_MAPS_SERVER_API_KEY: Optional[str] = None
    
    # Payment Settings
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Configuration to handle .env file loading and ignore extra variables
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # This prevents crashes if .env has extra variables
        case_sensitive=False
    )

settings = Settings()
db: Optional[Client] = None

# --- Firebase Initialization Logic ---
try:
    # We check the updated variable name here
    key_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY
    
    if key_path:
        # Check if the file actually exists before trying to load it
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            try:
                firebase_admin.get_app()
            except ValueError:
                firebase_admin.initialize_app(cred)
            
            db = firestore.client()
            print("Firebase Admin SDK initialized successfully.")
        else:
            print(f"Error: Firebase key file not found at path: {key_path}")
            db = None
    else:
        print("Warning: FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env. Firebase Admin SDK not initialized.")

except Exception as e:
    print(f"An unexpected error occurred during Firebase initialization: {e}")
    db = None

def get_db() -> Client:
    if db is None:
        raise RuntimeError("Firestore database client is not initialized.")
    return db

def get_auth():
    return auth