from firebase_admin import auth, firestore, messaging
from app.config import get_db, get_auth
from app.schemas import UserCreate, UserInDB, VerificationStatus, Coordinates
from app.services.google_maps import GoogleMapsService
from typing import Optional, List, Dict, Any
import datetime

class FirebaseService:

    def __init__(self):
        self.db = get_db()
        self.auth = get_auth()
        self.maps_service = GoogleMapsService()

    def create_user_in_auth(self, user_create: UserCreate) -> auth.UserRecord:
        """Creates a new user in Firebase Authentication."""
        try:
            user_record = self.auth.create_user(
                email=user_create.email,
                password=user_create.password,
                display_name=user_create.name
            )
            return user_record
        except auth.EmailAlreadyExistsError as e:
            raise  # Re-raise to be handled by the router
        except Exception as e:
            print(f"Error creating user in auth: {e}")
            raise

    def create_user_in_firestore(self, user_id: str, user_data: dict) -> None:
        """Creates a user document in the 'users' collection in Firestore."""
        try:
            user_ref = self.db.collection('users').document(user_id)

            # Geocode address if provided
            address = user_data.get("address")
            if address: # Check if address is not None or empty
                coordinates = self.maps_service.get_coordinates_for_address(address)
                if coordinates:
                    user_data["coordinates"] = coordinates.model_dump()
                else:
                    user_data["coordinates"] = None
                    print(f"Warning: Could not geocode address '{address}' for user {user_id}")
            else:
                 user_data["coordinates"] = None
                 print(f"Warning: No address provided for user {user_id}. Skipping geocoding.")

            user_ref.set(user_data)
        except Exception as e:
            print(f"Error creating user in firestore: {e}")
            raise

    def get_user_by_uid(self, user_id: str) -> Optional[UserInDB]:
        """Retrieves a user document from Firestore by their UID."""
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            if doc.exists:
                user_data = doc.to_dict()
                if user_data: # Ensure data is not empty
                    user_data['user_id'] = doc.id
                    return UserInDB.model_validate(user_data) # Use pydantic validation
                else:
                    return None
            else:
                return None
        except Exception as e:
            print(f"Error getting user by UID {user_id}: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[auth.UserRecord]:
        """Retrieves a user record from Firebase Auth by email."""
        try:
            user_record = self.auth.get_user_by_email(email)
            return user_record
        except auth.UserNotFoundError:
            return None
        except Exception as e:
            print(f"Error getting user by email {email}: {e}")
            return None

    def verify_firebase_token(self, id_token: str) -> dict:
        """Verifies a Firebase ID token and returns its decoded payload."""
        try:
            decoded_token = self.auth.verify_id_token(id_token)
            return decoded_token
        except auth.InvalidIdTokenError as e:
            raise ValueError(f"Invalid ID Token: {e}")
        except Exception as e:
            print(f"Error verifying Firebase token: {e}")
            raise

    def update_user_fcm_token(self, user_id: str, fcm_token: str) -> bool:
        """Updates or clears a user's FCM token in Firestore."""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({"fcm_token": fcm_token})
            return True
        except Exception as e:
            print(f"Error updating FCM token for user {user_id}: {e}")
            return False

    def get_pending_users(self) -> List[UserInDB]:
        """Retrieves all users with a 'Pending' verification status."""
        try:
            users_ref = self.db.collection('users')
            query = users_ref.where("verification_status", "==", VerificationStatus.PENDING)

            pending_users = []
            for doc in query.stream():
                user_data = doc.to_dict()
                if user_data: # Safety check
                    user_data['user_id'] = doc.id
                    pending_users.append(UserInDB.model_validate(user_data))
            return pending_users
        except Exception as e:
            print(f"Error fetching pending users: {e}")
            return []

    def update_user_verification_status(self, user_id: str, status: VerificationStatus, reason: Optional[str] = None) -> Optional[UserInDB]:
        """Updates a user's verification status and rejection reason."""
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            if not doc.exists:
                return None

            update_data: Dict[str, Any] = {"verification_status": status.value}
            if status == VerificationStatus.REJECTED and reason:
                update_data["verification_rejection_reason"] = reason
            else:
                # Clear the reason if status is not 'Rejected'
                update_data["verification_rejection_reason"] = None 

            user_ref.update(update_data)

            # Return the updated user data
            updated_doc = user_ref.get()
            if updated_doc.exists:
                user_data = updated_doc.to_dict()
                if user_data:
                    user_data['user_id'] = updated_doc.id
                    return UserInDB.model_validate(user_data)
            return None

        except Exception as e:
            print(f"Error updating verification status for user {user_id}: {e}")
            return None
            
    # --- ADDED METHOD ---
    def log_payment(self, payment_intent: Dict[str, Any]) -> None:
        """Logs a successful Stripe payment_intent to the 'donations' collection."""
        try:
            payment_id = payment_intent.get("id")
            if not payment_id:
                print("Error: Payment intent has no ID. Cannot log.")
                return

            donation_ref = self.db.collection('donations').document(payment_id)
            
            metadata = payment_intent.get("metadata", {})
            created_timestamp = payment_intent.get("created")
            
            donation_data = {
                "payment_intent_id": payment_id,
                "amount": payment_intent.get("amount"),
                "currency": payment_intent.get("currency"),
                "status": payment_intent.get("status"),
                "created_at": datetime.datetime.fromtimestamp(created_timestamp, datetime.timezone.utc) if created_timestamp else datetime.datetime.now(datetime.timezone.utc),
                "receipt_email": payment_intent.get("receipt_email"),
                "user_id": metadata.get("user_id"),
                "user_email": metadata.get("user_email"),
                "user_name": metadata.get("user_name"),
                "full_payment_intent_json": payment_intent # Store the whole object for auditing
            }
            
            donation_ref.set(donation_data)
            print(f"Successfully logged donation {payment_id}")
            
        except Exception as e:
            print(f"Error logging payment {payment_intent.get('id')}: {e}")
            # In a production app, you might want to log this to an error service
            pass


    def get_user_fcm_tokens(self, user_ids: List[str]) -> List[str]:
        """Retrieves a list of FCM tokens for a given list of user IDs."""
        tokens = []
        users_ref = self.db.collection('users')

        for user_id in user_ids:
            try:
                doc = users_ref.document(user_id).get()
                if doc.exists:
                    user_data = doc.to_dict()
                    if user_data and user_data.get("fcm_token"):
                        tokens.append(user_data["fcm_token"])
            except Exception as e:
                print(f"Error fetching fcm_token for user {user_id}: {e}")
        return list(set(tokens)) # Return unique tokens

    def send_push_notification(self, title: str, body: str, fcm_token: str):
        """Sends a single push notification to a specific device token."""
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=fcm_token,
        )
        try:
            response = messaging.send(message)
            print(f"Successfully sent message: {response}")
            return response
        except Exception as e:
            print(f"Error sending push notification: {e}")
            return None

    def send_multicast_push_notification(self, title: str, body: str, tokens: List[str]):
        """Sends a push notification to multiple device tokens."""
        if not tokens:
            print("No tokens provided for multicast message.")
            return None
            
        unique_tokens = list(set(tokens)) # Ensure tokens are unique

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            tokens=unique_tokens,
        )
        try:
            response = messaging.send_multicast(message)
            print(f"Successfully sent multicast message: {response.success_count} successes, {response.failure_count} failures.")
            if response.failure_count > 0:
                for i, send_response in enumerate(response.responses):
                    if not send_response.success:
                        print(f"Failed to send to token {unique_tokens[i]}: {send_response.exception}")
            return response
        except Exception as e:
            print(f"Error sending multicast push notification: {e}")
            return None