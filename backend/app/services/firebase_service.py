import os
from pathlib import Path
from firebase_admin import auth, firestore, messaging
from app.config import get_db, get_auth
from app.schemas import UserCreate, UserInDB, VerificationStatus, Coordinates, NotificationBase, PostStatus, BankingDetails
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

    def _fix_firestore_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not data:
            return data

        coords = data.get("coordinates")
        if coords:
            if hasattr(coords, 'latitude') and hasattr(coords, 'longitude'):
                data["coordinates"] = {
                    "lat": coords.latitude,
                    "lng": coords.longitude
                }

        return data

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

            if address and isinstance(address, str):
                coordinates = self.maps_service.get_coordinates_for_address(address)
                if coordinates:
                    user_data["coordinates"] = coordinates.model_dump()
                else:
                    user_data["coordinates"] = None
            else:
                 user_data["coordinates"] = None

            if "banking_details" not in user_data:
                user_data["banking_details"] = None

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
                if user_data is not None:
                    user_data['user_id'] = doc.id
                    user_data = self._fix_firestore_data(user_data)
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
            query = users_ref.where(filter=firestore.FieldFilter("verification_status", "==", VerificationStatus.PENDING))
            users = []
            for doc in query.stream():
                d = doc.to_dict()
                if d is not None:
                    d['user_id'] = doc.id
                    d = self._fix_firestore_data(d)
                    try:
                        users.append(UserInDB.model_validate(d))
                    except Exception as val_err:
                        print(f"Skipping invalid pending user {doc.id}: {val_err}")
            return users
        except Exception as e:
            print(f"Error fetching pending users: {e}")
            return []

    def get_all_users(self) -> List[UserInDB]:
        try:
            users_ref = self.db.collection('users')
            docs = users_ref.stream()
            users = []
            for doc in docs:
                d = doc.to_dict()
                if d is not None:
                    d['user_id'] = doc.id
                    d = self._fix_firestore_data(d)
                    try:
                        users.append(UserInDB.model_validate(d))
                    except Exception as validation_err:
                        # Silently skip valid users with incomplete schema updates in dev
                        pass
            return users
        except Exception as e:
            print(f"Error fetching all users: {e}")
            return []

    def update_user_verification_status(self, user_id: str, status: VerificationStatus, reason: Optional[str] = None) -> Optional[UserInDB]:
        try:
            ref = self.db.collection('users').document(user_id)
            update_data: Dict[str, Any] = {"verification_status": status.value}
            update_data["verification_rejection_reason"] = reason if status == VerificationStatus.REJECTED else None
            ref.update(update_data)

            user_doc = ref.get()
            if user_doc.exists:
                u_data = user_doc.to_dict()
                if u_data is not None:
                    u_data['user_id'] = user_doc.id
                    u_data = self._fix_firestore_data(u_data)
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

    def notify_admins_of_new_register(self, new_user_data: Dict[str, Any]):
        try:
            users_ref = self.db.collection('users')
            query = users_ref.where(filter=firestore.FieldFilter("role", "==", "Admin"))

            for doc in query.stream():
                admin_data = doc.to_dict()
                admin_id = doc.id
                admin_fcm = admin_data.get("fcm_token")

                title = "New Registration"
                body = f"New {new_user_data.get('role', 'User')}: {new_user_data.get('name')} needs verification."

                self.send_and_save_notification(
                    user_id=admin_id,
                    title=title,
                    body=body,
                    fcm_token=admin_fcm
                )
        except Exception as e:
            print(f"Error notifying admins: {e}")

    def notify_admins_of_deletion(self, user: UserInDB, reason: str):
        try:
            users_ref = self.db.collection('users')
            query = users_ref.where(filter=firestore.FieldFilter("role", "==", "Admin"))
            
            title = "User Account Deleted"
            body = f"User {user.name} ({user.role}) has deleted their account.\nReason: {reason}"

            for doc in query.stream():
                admin_data = doc.to_dict()
                admin_id = doc.id
                admin_fcm = admin_data.get("fcm_token")

                self.send_and_save_notification(
                    user_id=admin_id,
                    title=title,
                    body=body,
                    fcm_token=admin_fcm
                )
        except Exception as e:
            print(f"Error notifying admins of deletion: {e}")

    def notify_nearby_users_of_new_post(self, post_data: dict, radius_km: float = 20.0):
        try:
            if not post_data.get('coordinates'):
                return

            post_coords = Coordinates(**post_data['coordinates'])
            users_ref = self.db.collection('users')
            query = users_ref.where(filter=firestore.FieldFilter("verification_status", "==", "Approved"))

            tokens_to_notify = []

            for doc in query.stream():
                u_data = doc.to_dict()
                if not u_data: continue
                u_data = self._fix_firestore_data(u_data)

                if u_data.get('role') not in ['Receiver', 'Logistics']:
                    continue

                if not u_data.get('coordinates'):
                    continue

                user_coords_data = u_data['coordinates']
                if isinstance(user_coords_data, dict):
                    user_coords = Coordinates(**user_coords_data)
                else:
                    continue

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

    def notify_logistics_of_new_job(self, post_data: dict, radius_km: float = 50.0):
        try:
            if not post_data.get('coordinates'):
                return

            post_coords = Coordinates(**post_data['coordinates'])
            users_ref = self.db.collection('users')

            query = users_ref.where(filter=firestore.FieldFilter("role", "==", "Logistics"))\
                             .where(filter=firestore.FieldFilter("verification_status", "==", "Approved"))

            tokens_to_notify = []

            for doc in query.stream():
                u_data = doc.to_dict()
                if not u_data: continue
                u_data = self._fix_firestore_data(u_data)

                if not u_data.get('coordinates'):
                    continue

                user_coords_data = u_data['coordinates']
                if isinstance(user_coords_data, dict):
                    user_coords = Coordinates(**user_coords_data)
                else:
                    continue

                dist = self.maps_service.calculate_distance_km(post_coords, user_coords)

                if dist <= radius_km:
                    self.save_notification(
                        user_id=doc.id,
                        title="New Delivery Job Available",
                        body=f"Pickup required: {post_data.get('title')} ({dist:.1f}km away)",
                        data={"post_id": post_data.get('post_id'), "type": "job_alert"}
                    )

                    if u_data.get('fcm_token'):
                        tokens_to_notify.append(u_data['fcm_token'])

            if tokens_to_notify:
                self.send_multicast_push_notification(
                    title="New Delivery Job Available",
                    body=f"A new delivery job is available for {post_data.get('title')}.",
                    tokens=tokens_to_notify
                )

        except Exception as e:
            print(f"Error notifying logistics: {e}")

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
            messaging.send_multicast(message)
        except Exception as e:
            print(f"Multicast error: {e}")

    def log_payment(self, payment_intent: Dict[str, Any]) -> None:
        try:
            payment_id = payment_intent.get("id")
            if not payment_id: return

            self.db.collection('donations').document(str(payment_id)).set({
                "payment_intent_id": payment_id,
                "amount": payment_intent.get("amount"),
                "status": payment_intent.get("status"),
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "metadata": payment_intent.get("metadata", {})
            })

            try:
                users_ref = self.db.collection('users')
                query = users_ref.where(filter=firestore.FieldFilter("role", "==", "Admin"))
                for doc in query.stream():
                     self.save_notification(
                        user_id=doc.id,
                        title="New Monetary Donation",
                        body=f"Received donation of {payment_intent.get('amount')/100:.2f}",
                        data={"type": "finance"}
                     )
            except: pass

        except Exception as e:
            print(f"Error logging payment: {e}")

    def get_total_donations(self) -> int:
        """Returns total amount donated in cents (Admin Only)."""
        try:
            donations_ref = self.db.collection('donations')
            total = 0
            for doc in donations_ref.stream():
                data = doc.to_dict()
                if data.get('status') == 'COMPLETED':
                    total += int(data.get('amount', 0))
            return total
        except Exception as e:
            print(f"Error calculating total donations: {e}")
            return 0

    def get_total_disbursements(self) -> int:
        """Returns total amount disbursed in cents (Admin Only)."""
        try:
            disbursements_ref = self.db.collection('disbursements')
            total = 0
            for doc in disbursements_ref.stream():
                data = doc.to_dict()
                total += int(data.get('amount', 0))
            return total
        except Exception as e:
            print(f"Error calculating disbursements: {e}")
            return 0

    def record_disbursement(self, admin_id: str, receiver_id: str, amount: int, reference: str) -> bool:
        try:
            self.db.collection('disbursements').add({
                "admin_id": admin_id,
                "receiver_id": receiver_id,
                "amount": amount,
                "reference": reference,
                "created_at": datetime.datetime.now(datetime.timezone.utc)
            })

            receiver = self.get_user_by_uid(receiver_id)
            if receiver:
                 self.send_and_save_notification(
                    user_id=receiver_id,
                    title="Funds Received",
                    body=f"We have disbursed {amount/100:.2f} to your bank account. Ref: {reference}",
                    fcm_token=receiver.fcm_token
                )

            return True
        except Exception as e:
            print(f"Error recording disbursement: {e}")
            return False

    def delete_user(self, user_id: str) -> bool:
        try:
            # Delete from Firestore
            self.db.collection('users').document(user_id).delete()

            try:
                # Delete from Firebase Auth
                self.auth.delete_user(user_id)
            except auth.UserNotFoundError:
                print(f"User {user_id} not found in Auth, skipping auth deletion.")
            except Exception as auth_error:
                print(f"Error deleting user from Auth: {auth_error}")

            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False