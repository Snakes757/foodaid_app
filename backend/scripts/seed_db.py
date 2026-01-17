import sys
import os
import datetime
import random
from firebase_admin import auth

# Ensure the app module is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import db, get_auth
from app.schemas import (
    UserRole, VerificationStatus, PostStatus, DeliveryMethod, Coordinates
)
from app.services.firebase_service import FirebaseService

def seed_data():
    """
    Seeds the Firestore database and Firebase Auth with mock data.
    """
    if not db:
        print("[ERROR] Database not initialized. Check your .env file and credentials.")
        return

    print("🌱 Starting Database Seed/Migration...")
    
    service = FirebaseService()
    
    # --- 1. MOCK USERS ---
    mock_users = [
        {
            "email": "admin@foodaid.com",
            "password": "password123",
            "name": "Super Admin",
            "role": UserRole.ADMIN,
            "verification_status": VerificationStatus.APPROVED,
            "phone_number": "+27110000000",
            "address": "1 Admin Way, Tech City",
            "coordinates": {"lat": -26.2041, "lng": 28.0473} # JHB
        },
        {
            "email": "donor@foodaid.com",
            "password": "password123",
            "name": "Joe's Bakery",
            "role": UserRole.DONOR,
            "verification_status": VerificationStatus.APPROVED,
            "phone_number": "+27111111111",
            "address": "12 Baker Street, Rosebank",
            "coordinates": {"lat": -26.1450, "lng": 28.0400} # Rosebank
        },
        {
            "email": "receiver@foodaid.com",
            "password": "password123",
            "name": "Hope Shelter",
            "role": UserRole.RECEIVER,
            "verification_status": VerificationStatus.APPROVED,
            "phone_number": "+27112222222",
            "address": "45 Charity Lane, Soweto",
            "coordinates": {"lat": -26.2350, "lng": 27.9100} # Soweto
        },
        {
            "email": "driver@foodaid.com",
            "password": "password123",
            "name": "Fast Logistics",
            "role": UserRole.LOGISTICS,
            "verification_status": VerificationStatus.APPROVED,
            "phone_number": "+27113333333",
            "address": "88 Transport Rd, Midrand",
            "coordinates": {"lat": -26.0100, "lng": 28.1200} # Midrand
        },
        {
            "email": "newuser@foodaid.com",
            "password": "password123",
            "name": "Pending NGO",
            "role": UserRole.RECEIVER,
            "verification_status": VerificationStatus.PENDING,
            "phone_number": "+27114444444",
            "address": "99 Waiting List Blvd",
            "coordinates": None
        }
    ]

    user_ids = {}

    print("\n--- Seeding Users ---")
    for user_data in mock_users:
        email = user_data["email"]
        try:
            # 1. Create or Get User in Firebase Auth
            try:
                user_record = auth.get_user_by_email(email)
                print(f"  Existing Auth User found: {email}")
            except auth.UserNotFoundError:
                user_record = auth.create_user(
                    email=email,
                    password=user_data["password"],
                    display_name=user_data["name"],
                    phone_number=None # Skipping phone auth for mock
                )
                print(f"  Created Auth User: {email}")

            uid = user_record.uid
            user_ids[user_data["role"]] = uid

            # 2. Create or Update User Profile in Firestore
            # We construct the dictionary manually to match UserInDB schema requirements
            firestore_data = {
                "user_id": uid,
                "email": email,
                "role": user_data["role"].value,
                "name": user_data["name"],
                "address": user_data["address"],
                "phone_number": user_data["phone_number"],
                "verification_status": user_data["verification_status"].value,
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "fcm_token": None,
                "coordinates": user_data["coordinates"]
            }
            
            # Using set(..., merge=True) acts like an 'upsert' migration
            db.collection('users').document(uid).set(firestore_data, merge=True)
            print(f"  -> Synced Firestore Profile: {user_data['name']}")

        except Exception as e:
            print(f"  [FAILED] Could not process {email}: {e}")

    # --- 2. MOCK FOOD POSTS ---
    print("\n--- Seeding Food Posts ---")
    
    donor_id = user_ids.get(UserRole.DONOR)
    receiver_id = user_ids.get(UserRole.RECEIVER)
    driver_id = user_ids.get(UserRole.LOGISTICS)

    if not donor_id:
        print("Skipping posts: No donor created.")
        return

    # Define mock posts
    now = datetime.datetime.now(datetime.timezone.utc)
    future = now + datetime.timedelta(days=7)

    mock_posts = [
        {
            "title": "50 Loaves of Sourdough",
            "description": "Freshly baked sourdough from yesterday. Still good for consumption.",
            "quantity": "50 Loaves",
            "address": "12 Baker Street, Rosebank",
            "expiry": future,
            "status": PostStatus.AVAILABLE,
            "coordinates": {"lat": -26.1450, "lng": 28.0400},
            "donor_id": donor_id,
            "donor_details": {
                "user_id": donor_id,
                "name": "Joe's Bakery", 
                "email": "donor@foodaid.com",
                "role": "Donor",
                "address": "12 Baker Street, Rosebank",
                "verification_status": "Approved"
            }
        },
        {
            "title": "Canned Beans & Veg",
            "description": "Box of mixed canned goods. Dented cans but sealed.",
            "quantity": "2 Boxes",
            "address": "12 Baker Street, Rosebank",
            "expiry": future,
            "status": PostStatus.RESERVED,
            "coordinates": {"lat": -26.1450, "lng": 28.0400},
            "donor_id": donor_id,
            "receiver_id": receiver_id,
            "reserved_at": now,
            "delivery_method": DeliveryMethod.DELIVERY, # Needs pickup
            "donor_details": {
                "user_id": donor_id,
                "name": "Joe's Bakery",
                "email": "donor@foodaid.com",
                "role": "Donor",
                "address": "12 Baker Street, Rosebank",
                "verification_status": "Approved"
            }
        },
        {
            "title": "Surplus Wedding Catering",
            "description": "Cooked rice and stew. Kept refrigerated.",
            "quantity": "20kg",
            "address": "12 Baker Street, Rosebank",
            "expiry": now + datetime.timedelta(hours=24),
            "status": PostStatus.IN_TRANSIT,
            "coordinates": {"lat": -26.1450, "lng": 28.0400},
            "donor_id": donor_id,
            "receiver_id": receiver_id,
            "logistics_id": driver_id,
            "reserved_at": now,
            "picked_up_at": now,
            "delivery_method": DeliveryMethod.DELIVERY,
            "donor_details": {
                "user_id": donor_id,
                "name": "Joe's Bakery",
                "email": "donor@foodaid.com",
                "role": "Donor",
                "address": "12 Baker Street, Rosebank",
                "verification_status": "Approved"
            }
        }
    ]

    for post in mock_posts:
        # Check if a similar post exists to avoid infinite duplicates on re-runs
        # (Simple check based on title and donor)
        existing_query = db.collection('foodPosts')\
            .where("donor_id", "==", donor_id)\
            .where("title", "==", post["title"])\
            .limit(1).stream()
        
        if any(existing_query):
            print(f"  Skipping existing post: {post['title']}")
            continue

        # Add new post
        # Clean dict to ensure dates are standard Python datetimes (Firestore handles them)
        try:
            doc_ref = db.collection('foodPosts').document()
            doc_ref.set(post)
            print(f"  -> Created Post: {post['title']} [{post['status'].value}]")
            
            # If reserved, also create a reservation record for consistency
            if post.get("status") in [PostStatus.RESERVED, PostStatus.IN_TRANSIT]:
                db.collection('reservations').add({
                    "post_id": doc_ref.id,
                    "receiver_id": post.get("receiver_id"),
                    "donor_id": post.get("donor_id"),
                    "timestamp": now,
                    "status": "Active",
                    "delivery_method": post.get("delivery_method")
                })
                print(f"     + Linked Reservation Record")

        except Exception as e:
            print(f"  [FAILED] Create post {post['title']}: {e}")

    print("\n Seed Complete! You can now log in with:")
    print("   Donor: donor@foodaid.com / password123")
    print("   Receiver: receiver@foodaid.com / password123")
    print("   Driver: driver@foodaid.com / password123")
    print("   Admin: admin@foodaid.com / password123")

if __name__ == "__main__":
    seed_data()