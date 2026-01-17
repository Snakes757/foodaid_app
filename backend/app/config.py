import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud.firestore import Client
from typing import Optional
from pathlib import Path

load_dotenv()

class Settings(BaseSettings):

    API_PORT: int = 8000
    API_HOST: str = "0.0.0.0"

    FIREBASE_SERVICE_ACCOUNT_KEY: Optional[str] = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    GOOGLE_MAPS_SERVER_API_KEY: Optional[str] = os.getenv("GOOGLE_MAPS_SERVER_API_KEY")

    # PayPal
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_MODE: str = "sandbox" # 'sandbox' or 'live'

    # Flutterwave
    FLUTTERWAVE_PUBLIC_KEY: Optional[str] = None
    FLUTTERWAVE_SECRET_KEY: Optional[str] = None
    FLUTTERWAVE_SECRET_HASH: Optional[str] = None # For webhook signature verification
    FLUTTERWAVE_BASE_URL: str = "https://api.flutterwave.com/v3"

    @property
    def PAYPAL_BASE_URL(self):
        return "https://api-m.paypal.com" if self.PAYPAL_MODE == "live" else "https://api-m.sandbox.paypal.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

settings = Settings()
db: Optional[Client] = None

BASE_DIR = Path(__file__).resolve().parents[1]

# --- Firebase Initialization Logic ---
try:
    key_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY

    if not key_path:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_KEY not set in .env")

    cred_path = BASE_DIR / key_path

    if not cred_path.exists():
        raise FileNotFoundError(f"Firebase key not found at: {cred_path}")

    cred = credentials.Certificate(str(cred_path))

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    db = firestore.client()

except Exception as e:
    print(f"[FIREBASE INIT ERROR] {e}")
    db = None

def get_db() -> Client:
    if db is None:
        raise RuntimeError("Firestore database client is not initialized.")
    return db

def get_auth():
    return auth