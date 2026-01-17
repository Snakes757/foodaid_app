from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
import datetime
from typing import Optional
from pydantic import BaseModel

from app.schemas import (
    UserCreate, UserPublic, UserInDB, FCMTokenUpdate,
    VerificationStatus, Coordinates, UserCreateGoogle, TokenData
)
from app.services.firebase_service import FirebaseService
from app.dependencies import get_firebase_service, get_current_user_from_db, get_current_user_data
from app.services.google_maps import GoogleMapsService

router = APIRouter()

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    verification_document_url: Optional[str] = None

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_new_user(
    user_create: UserCreate,
    service: FirebaseService = Depends(get_firebase_service)
):
    try:
        # Create in Firebase Auth
        user_record = service.create_user_in_auth(user_create)
        uid = user_record.uid

        # Create in Firestore
        user_data_dict = user_create.model_dump(exclude={"password"})
        user_data_dict["user_id"] = uid
        user_data_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        user_data_dict["verification_status"] = VerificationStatus.PENDING
        user_data_dict["coordinates"] = None
        user_data_dict["fcm_token"] = None
        user_data_dict["verification_document_url"] = None

        service.create_user_in_firestore(str(uid), user_data_dict)

        user_in_db = service.get_user_by_uid(str(uid))
        if user_in_db:
            return UserPublic.model_validate(user_in_db.model_dump())

        return UserPublic.model_validate(user_data_dict)

    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The email address is already in use."
        )
    except Exception as e:
        print(f"Registration Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {e}"
        )

@router.post("/register/google", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_google_user(
    user_data: UserCreateGoogle,
    token_data: TokenData = Depends(get_current_user_data),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Creates a Firestore profile for a user who has already signed in via Google (OAuth).
    Does NOT create a new Auth user (since they already exist).
    """
    try:
        uid = token_data.user_id

        # Check if user already exists to prevent overwrite
        existing_user = service.get_user_by_uid(uid)
        if existing_user:
            return UserPublic.model_validate(existing_user.model_dump())

        # Prepare data for Firestore
        data_dict = user_data.model_dump()
        data_dict["user_id"] = uid
        data_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        data_dict["verification_status"] = VerificationStatus.PENDING
        data_dict["coordinates"] = None
        data_dict["fcm_token"] = None
        data_dict["verification_document_url"] = None
        
        # Override email from token to ensure security
        if token_data.email:
            data_dict["email"] = token_data.email

        service.create_user_in_firestore(str(uid), data_dict)

        user_in_db = service.get_user_by_uid(str(uid))
        if user_in_db:
            return UserPublic.model_validate(user_in_db.model_dump())
        
        return UserPublic.model_validate(data_dict)

    except Exception as e:
        print(f"Google Registration Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {e}"
        )

@router.get("/me", response_model=UserPublic)
async def get_own_profile(
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    return UserPublic.model_validate(current_user.model_dump())

@router.put("/me", response_model=UserPublic)
async def update_own_profile(
    update_data: UserUpdate,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
    # Reference to document
    user_ref = service.db.collection('users').document(current_user.user_id)
    updates = {}

    if update_data.name:
        updates["name"] = update_data.name
    if update_data.phone_number:
        updates["phone_number"] = update_data.phone_number
    if update_data.verification_document_url:
        updates["verification_document_url"] = update_data.verification_document_url

    if update_data.address and update_data.address != current_user.address:
        updates["address"] = update_data.address
        coords = service.maps_service.get_coordinates_for_address(update_data.address)
        if coords:
            updates["coordinates"] = coords.model_dump()
        else:
            # Maybe allow update but warn? Or reject.
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not validate new address.")

    if not updates:
        return UserPublic.model_validate(current_user.model_dump())

    try:
        user_ref.update(updates)
        updated_doc = user_ref.get()
        return UserPublic.model_validate({**updated_doc.to_dict(), "user_id": updated_doc.id})
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error updating profile: {e}")

@router.post("/me/fcm-token", status_code=status.HTTP_204_NO_CONTENT)
async def update_fcm_token(
    token_data: FCMTokenUpdate,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
    success = service.update_user_fcm_token(current_user.user_id, token_data.fcm_token)
    if not success:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update FCM token.")
    return