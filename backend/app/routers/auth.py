from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
import datetime

from app.schemas import UserCreate, UserPublic, UserInDB, FCMTokenUpdate, VerificationStatus, Coordinates
from app.services.firebase_service import FirebaseService
from app.dependencies import get_firebase_service, get_current_user_from_db

router = APIRouter()

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_new_user(
    user_create: UserCreate,
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Registers a new user in Firebase Auth and creates their user profile
    in Firestore.
    """
    try:
        # 1. Create user in Firebase Authentication
        user_record = service.create_user_in_auth(user_create)
        uid = user_record.uid

        # 2. Prepare user data for Firestore
        user_data_dict = user_create.model_dump(exclude={"password"})
        user_data_dict["user_id"] = uid
        user_data_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        
        # Add default fields from UserInDB model
        user_data_dict["verification_status"] = VerificationStatus.PENDING
        user_data_dict["coordinates"] = None  # Will be populated by create_user_in_firestore
        user_data_dict["fcm_token"] = None
        user_data_dict["verification_document_url"] = None

        # 3. Create user profile in Firestore (this also handles geocoding)
        service.create_user_in_firestore(str(uid), user_data_dict)

        # 4. Retrieve the complete user profile from Firestore
        user_in_db = service.get_user_by_uid(str(uid))
        
        if user_in_db:
            # Use model_validate to safely create the response model
            return UserPublic.model_validate(user_in_db.model_dump())
        else:
            # Fallback in case retrieval fails (should ideally not happen)
            print(f"Warning: Could not retrieve user {uid} immediately after creation.")
            return UserPublic.model_validate(user_data_dict)

    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The email address is already in use by another account."
        )
    except Exception as e:
        print(f"Error during registration: {e}") # Log the full error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {e}"
        )

@router.get("/me", response_model=UserPublic)
async def get_own_profile(
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """
    Retrieves the public profile of the currently authenticated user.
    """
    # current_user is UserInDB, safely convert to UserPublic
    return UserPublic.model_validate(current_user.model_dump())

@router.post("/me/fcm-token", status_code=status.HTTP_204_NO_CONTENT)
async def update_fcm_token(
    token_data: FCMTokenUpdate,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Updates the FCM token for the currently authenticated user
    to enable push notifications.
    """
    if not current_user.user_id:
        raise HTTPException(status_code=403, detail="User ID not found.")
        
    success = service.update_user_fcm_token(current_user.user_id, token_data.fcm_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update FCM token."
        )
    return