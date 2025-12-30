import os
from pathlib import Path
from firebase_admin import auth, firestore, messaging
from app.config import get_db, get_auth
from app.schemas import UserCreate, UserInDB, VerificationStatus, Coordinates, NotificationBase, PostStatus
from app.services.google_maps import GoogleMapsService
from typing import Optional, List, Dict, Any
import datetime

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
cred_path = BASE_DIR / os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-credentials.json")

class FirebaseService:

    def __init__(self):
        self.db = get_db()
        self.auth = get_auth()
        self.maps_service = GoogleMapsService()

    def create_user_in_auth(self, user_create: UserCreate) -> auth.UserRecord:
        try:
            user_record = self.auth.create_user(
                email=user_create.email,
                password=user_create.password,
                display_name=user_create.name
            )
            return user_record
        except auth.EmailAlreadyExistsError:
            raise
        except Exception as e:
            print(f"Error creating user in auth: {e}")
            raise

    def create_user_in_firestore(self, user_id: str, user_data: Dict[str, Any]) -> None:
        try:
            user_ref = self.db.collection('users').document(user_id)
            address = user_data.get("address")
            
            # Explicitly type checking to handle strict mode
            if address and isinstance(address, str):
                coordinates = self.maps_service.get_coordinates_for_address(address)
                if coordinates:
                    user_data["coordinates"] = coordinates.model_dump()
                else:
                    user_data["coordinates"] = None
            else:
                 user_data["coordinates"] = None

            user_ref.set(user_data)
        except Exception as e:
            print(f"Error creating user in firestore: {e}")
            raise

    def get_user_by_uid(self, user_id: str) -> Optional[UserInDB]:
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            if doc.exists:
                user_data = doc.to_dict()
                # Explicit check for None to satisfy type checker
                if user_data is not None:
                    user_data['user_id'] = doc.id
                    return UserInDB.model_validate(user_data)
            return None
        except Exception as e:
            print(f"Error getting user by UID {user_id}: {e}")
            return None

    def update_user_fcm_token(self, user_id: str, fcm_token: str) -> bool:
        try:
            self.db.collection('users').document(user_id).update({"fcm_token": fcm_token})
            return True
        except Exception as e:
            print(f"Error updating FCM token: {e}")
            return False

    def verify_firebase_token(self, id_token: str) -> dict:
        try:
            return self.auth.verify_id_token(id_token)
        except Exception as e:
            raise ValueError(f"Invalid ID Token: {e}")

    def get_pending_users(self) -> List[UserInDB]:
        try:
            users_ref = self.db.collection('users')
            query = users_ref.where("verification_status", "==", VerificationStatus.PENDING)
            users = []
            for doc in query.stream():
                d = doc.to_dict()
                if d is not None:
                    d['user_id'] = doc.id
                    users.append(UserInDB.model_validate(d))
            return users
        except Exception as e:
            print(f"Error fetching pending users: {e}")
            return []

    def update_user_verification_status(self, user_id: str, status: VerificationStatus, reason: Optional[str] = None) -> Optional[UserInDB]:
        try:
            ref = self.db.collection('users').document(user_id)
            # Explicitly type to allow mixed types (str and None)
            update_data: Dict[str, Any] = {"verification_status": status.value}
            update_data["verification_rejection_reason"] = reason if status == VerificationStatus.REJECTED else None
            ref.update(update_data)

            user_doc = ref.get()
            if user_doc.exists:
                u_data = user_doc.to_dict()
                if u_data is not None:
                    u_data['user_id'] = user_doc.id
                    user = UserInDB.model_validate(u_data)

                    msg_body = f"Your account has been {status.value}."
                    if reason: msg_body += f" Reason: {reason}"
                    self.send_and_save_notification(
                        user_id=user_id,
                        title="Verification Update",
                        body=msg_body,
                        fcm_token=user.fcm_token
                    )
                    return user
            return None
        except Exception as e:
            print(f"Error updating verification: {e}")
            return None

    def notify_nearby_users_of_new_post(self, post_data: dict, radius_km: float = 20.0):
        try:
            if not post_data.get('coordinates'):
                return 

            post_coords = Coordinates(**post_data['coordinates'])

            users_ref = self.db.collection('users')
            # Firestore query limitations mean we can't filter by distance here efficiently without GeoFire
            # We filter by approved status first
            query = users_ref.where("verification_status", "==", "Approved")

            tokens_to_notify = []

            for doc in query.stream():
                u_data = doc.to_dict()
                if not u_data: continue

                if u_data.get('role') not in ['Receiver', 'Logistics']:
                    continue

                if not u_data.get('coordinates'):
                    continue

                user_coords = Coordinates(**u_data['coordinates'])
                dist = self.maps_service.calculate_distance_km(post_coords, user_coords)

                if dist <= radius_km:
                    if u_data.get('fcm_token'):
                        tokens_to_notify.append(u_data['fcm_token'])

                    self.save_notification(
                        user_id=doc.id,
                        title="New Food Donation Nearby!",
                        body=f"{post_data.get('title')} is available {dist:.1f}km away.",
                        data={"post_id": post_data.get('post_id')}
                    )

            if tokens_to_notify:
                self.send_multicast_push_notification(
                    title="New Food Donation Nearby!",
                    body=f"{post_data.get('title')} is available near you.",
                    tokens=tokens_to_notify
                )

        except Exception as e:
            print(f"Error in notify_nearby_users: {e}")

    def save_notification(self, user_id: str, title: str, body: str, data: Optional[dict] = None):
        try:
            notif_data = {
                "user_id": user_id,
                "title": title,
                "body": body,
                "read": False,
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "data": data or {}
            }
            self.db.collection('notifications').add(notif_data)
        except Exception as e:
            print(f"Error saving notification: {e}")

    def send_and_save_notification(self, user_id: str, title: str, body: str, fcm_token: Optional[str] = None):
        self.save_notification(user_id, title, body)
        if fcm_token:
            self.send_push_notification(title, body, fcm_token)

    def send_push_notification(self, title: str, body: str, fcm_token: str):
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=fcm_token,
            )
            messaging.send(message)
        except Exception as e:
            print(f"Push error: {e}")

    def send_multicast_push_notification(self, title: str, body: str, tokens: List[str]):
        if not tokens: return
        try:
            unique = list(set(tokens))
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                tokens=unique,
            )
            # Suppress Pylance error for dynamically loaded attribute
            messaging.send_multicast(message) # type: ignore
        except Exception as e:
            print(f"Multicast error: {e}")

    def log_payment(self, payment_intent: Dict[str, Any]) -> None:
        try:
            payment_id = payment_intent.get("id")
            if not payment_id: return
            
            # Use str() to ensure the ID is a string for the document path
            self.db.collection('donations').document(str(payment_id)).set({
                "payment_intent_id": payment_id,
                "amount": payment_intent.get("amount"),
                "status": payment_intent.get("status"),
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "metadata": payment_intent.get("metadata", {})
            })
        except Exception:
            pass