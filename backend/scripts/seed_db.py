import sys
import os
import datetime
import firebase_admin
from firebase_admin import firestore

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import from your app
try:
    from app.config import get_db
    from app.schemas import UserRole, PostStatus, VerificationStatus
except ImportError as e:
    print(f"Error importing app modules: {e}")
    print("Make sure you are running this script from the root 'backend' folder or 'backend/scripts'.")
    sys.exit(1)

def seed_database():
    print("🌱 Initializing Firestore Database Seeding...")
    
    # 1. Initialize DB Connection
    try:
        db = get_db()
        print("✅ Connected to Firestore.")
    except Exception as e:
        print(f"❌ Failed to connect to Firestore. Check your .env and Service Account Key.\nError: {e}")
        return

    # --- SEED USERS ---
    print("\nCreating 'users' collection...")
    users_ref = db.collection('users')

    # Sample Donor
    donor_id = "sample_donor_001"
    donor_data = {
        "user_id": donor_id,
        "email": "donor@example.com",
        "role": UserRole.DONOR.value,
        "name": "Sunshine Bakery",
        "address": "123 Pretorius St, Pretoria",
        "phone_number": "+27123456789",
        "verification_status": VerificationStatus.APPROVED.value,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "coordinates": {"lat": -25.7479, "lng": 28.2293}, 
        "fcm_token": None,
        "verification_document_url": None
    }
    users_ref.document(donor_id).set(donor_data)
    print(f"   - Added Donor: {donor_data['name']}")

    # Sample Receiver (NGO)
    receiver_id = "sample_receiver_001"
    receiver_data = {
        "user_id": receiver_id,
        "email": "ngo@example.com",
        "role": UserRole.RECEIVER.value,
        "name": "Hope Shelter",
        "address": "456 Francis Baard St, Pretoria",
        "phone_number": "+27987654321",
        "verification_status": VerificationStatus.APPROVED.value,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "coordinates": {"lat": -25.7460, "lng": 28.2100},
        "fcm_token": None,
        "verification_document_url": None
    }
    users_ref.document(receiver_id).set(receiver_data)
    print(f"   - Added Receiver: {receiver_data['name']}")

    # --- SEED FOOD POSTS ---
    print("\nCreating 'foodPosts' collection...")
    posts_ref = db.collection('foodPosts')
    
    post_id = "sample_post_001"
    post_data = {
        "post_id": post_id,
        "donor_id": donor_id,
        "title": "Surplus Bread Loaves",
        "description": "20 loaves of brown bread baked this morning.",
        "quantity": "20 Loaves",
        "address": "123 Pretorius St, Pretoria",
        "expiry": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2),
        "status": PostStatus.AVAILABLE.value,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "coordinates": {"lat": -25.7479, "lng": 28.2293},
        "image_url": "https://placehold.co/600x400/orange/white?text=Bread",
        "donor_details": { # Cache donor details
            "name": donor_data['name'],
            "role": donor_data['role'],
            "email": donor_data['email'],
            "user_id": donor_data['user_id'],
            "address": donor_data['address'],
            "verification_status": donor_data['verification_status'],
            "coordinates": donor_data['coordinates']
        }
    }
    posts_ref.document(post_id).set(post_data)
    print(f"   - Added Post: {post_data['title']}")

    # --- SEED RESERVATIONS (Empty for now) ---
    print("\nCreating 'reservations' collection (adding dummy doc then deleting to initialize)...")
    # Note: Collections don't strictly need initialization, but this verifies permission
    reservations_ref = db.collection('reservations')
    dummy_res_ref = reservations_ref.document('init_check')
    dummy_res_ref.set({"status": "check"})
    dummy_res_ref.delete()
    print("   - Verified 'reservations' access.")

    # --- SEED DONATIONS (Empty for now) ---
    print("\nCreating 'donations' collection...")
    donations_ref = db.collection('donations')
    dummy_don_ref = donations_ref.document('init_check')
    dummy_don_ref.set({"status": "check"})
    dummy_don_ref.delete()
    print("   - Verified 'donations' access.")

    print("\n✨ Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()