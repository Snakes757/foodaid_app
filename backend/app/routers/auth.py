from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
import datetime
from typing import Optional
from pydantic import BaseModel

from app.schemas import (
    UserCreate, UserPublic, UserInDB, FCMTokenUpdate, 
    VerificationStatus, Coordinates
)
from app.services.firebase_service import FirebaseService
from app.dependencies import get_firebase_service, get_current_user_from_db
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
        # 1. Create in Firebase Auth
        user_record = service.create_user_in_auth(user_create)
        uid = user_record.uid

        # 2. Prepare Firestore Data
        user_data_dict = user_create.model_dump(exclude={"password"})
        user_data_dict["user_id"] = uid
        user_data_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        user_data_dict["verification_status"] = VerificationStatus.PENDING
        user_data_dict["coordinates"] = None
        user_data_dict["fcm_token"] = None
        user_data_dict["verification_document_url"] = None

        # 3. Create in Firestore (Handles Geocoding internally in service)
        service.create_user_in_firestore(str(uid), user_data_dict)

        # 4. Retrieve and Return
        user_in_db = service.get_user_by_uid(str(uid))
        if user_in_db:
            return UserPublic.model_validate(user_in_db.model_dump())
        
        # Fallback
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
    """
    Update profile details. If address changes, re-geocode.
    If document uploaded, admin might need to re-verify (logic implies status reset not strictly enforced here but good practice).
    """
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
            # If geocoding fails, warn but allow address update? 
            # Stricter: Fail request.
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