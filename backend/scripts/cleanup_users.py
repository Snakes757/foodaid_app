import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore, auth
from pathlib import Path
from dotenv import load_dotenv

# Ensure we can find the .env file
# Assuming this script is run from the backend root or scripts/ folder
backend_root = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_root))

load_dotenv(backend_root / ".env")

def initialize_firebase():
    """Initializes Firebase using the same credentials as the main app."""
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not key_path:
        print("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not set in .env")
        sys.exit(1)

    # Resolve key path relative to backend root if it's not absolute
    cred_path = Path(key_path)
    if not cred_path.is_absolute():
        cred_path = backend_root / key_path

    if not cred_path.exists():
        print(f"❌ Error: Credentials file not found at: {cred_path}")
        sys.exit(1)

    try:
        cred = credentials.Certificate(str(cred_path))
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        print(" Firebase initialized successfully.")
        return firestore.client()
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        sys.exit(1)

def cleanup_database():
    db = initialize_firebase()
    users_ref = db.collection('users')
    
    print("\n🔍 Scanning 'users' collection for invalid data...")
    
    docs = users_ref.stream()
    deleted_count = 0
    
    # Valid values based on your Enums
    VALID_ROLES = {'Donor', 'Receiver', 'Admin', 'Logistics'}
    VALID_STATUSES = {'Pending', 'Approved', 'Rejected'}

    for doc in docs:
        user_data = doc.to_dict()
        user_id = doc.id
        
        is_invalid = False
        reasons = []

        # 1. Check Email
        email = user_data.get('email', '')
        if not email or "@" not in email or "User's email address" in email:
            is_invalid = True
            reasons.append(f"Invalid Email: '{email}'")

        # 2. Check Role
        role = user_data.get('role', '')
        if role not in VALID_ROLES:
            is_invalid = True
            reasons.append(f"Invalid Role: '{role}'")

        # 3. Check Verification Status
        status = user_data.get('verification_status', '')
        if status not in VALID_STATUSES:
            is_invalid = True
            reasons.append(f"Invalid Status: '{status}'")

        if is_invalid:
            print(f"\n  Deleting User ID: {user_id}")
            for r in reasons:
                print(f"   - {r}")
            
            # Delete from Firestore
            try:
                db.collection('users').document(user_id).delete()
                print("    Deleted from Firestore")
            except Exception as e:
                print(f"    Firestore Delete Failed: {e}")

            # Delete from Auth (if exists)
            try:
                auth.delete_user(user_id)
                print("    Deleted from Firebase Auth")
            except auth.UserNotFoundError:
                print("   ℹ  User not found in Auth (already gone)")
            except Exception as e:
                print(f"    Auth Delete Error: {e}")
            
            deleted_count += 1

    print(f"\n✨ Cleanup Complete. Removed {deleted_count} invalid user(s).")

if __name__ == "__main__":
    cleanup_database()