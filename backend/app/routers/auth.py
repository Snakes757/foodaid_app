from fastapi import APIRouter, Depends, HTTPException, status, Request
from firebase_admin import auth
import datetime
from typing import Optional
from pydantic import BaseModel

from app.schemas import (
    UserCreate, UserPublic, UserInDB, FCMTokenUpdate,
    VerificationStatus, Coordinates, TokenData,
    UserPublicWithBank, BankingDetails, UserRole, UserDeleteRequest
)
from app.services.firebase_service import FirebaseService
from app.dependencies import get_firebase_service, get_current_user_from_db, get_current_user_data
from app.services.google_maps import GoogleMapsService
from app.limiter import limiter

router = APIRouter()

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    verification_document_url: Optional[str] = None
    banking_details: Optional[BankingDetails] = None

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_new_user(
    request: Request,
    user_create: UserCreate,
    service: FirebaseService = Depends(get_firebase_service)
):
    try:
        user_record = service.create_user_in_auth(user_create)
        uid = user_record.uid

        user_data_dict = user_create.model_dump(exclude={"password"})
        user_data_dict["user_id"] = uid
        user_data_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        user_data_dict["verification_status"] = VerificationStatus.PENDING
        user_data_dict["coordinates"] = None
        user_data_dict["fcm_token"] = None
        user_data_dict["banking_details"] = None

        if "verification_document_url" not in user_data_dict:
             user_data_dict["verification_document_url"] = None

        service.create_user_in_firestore(str(uid), user_data_dict)
        service.notify_admins_of_new_register(user_data_dict)

        user_in_db = service.get_user_by_uid(str(uid))
        if user_in_db:
            return UserPublic.model_validate(user_in_db.model_dump())

        return UserPublic.model_validate(user_data_dict)

    except auth.EmailAlreadyExistsError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="The email address is already in use.")
    except Exception as e:
        print(f"Registration Error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed.")

@router.get("/me", response_model=UserPublicWithBank)
async def get_own_profile(
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    return UserPublicWithBank.model_validate(current_user.model_dump())

@router.put("/me", response_model=UserPublicWithBank)
async def update_own_profile(
    update_data: UserUpdate,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
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
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid address.")

    if update_data.banking_details:
        if current_user.role == UserRole.RECEIVER:
            updates["banking_details"] = update_data.banking_details.model_dump()
        else:
             # Just ignore it for others
             pass

    if not updates:
        return UserPublicWithBank.model_validate(current_user.model_dump())

    try:
        user_ref.update(updates)
        updated_doc = user_ref.get()
        return UserPublicWithBank.model_validate({**updated_doc.to_dict(), "user_id": updated_doc.id})
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Profile Update Error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update profile.")

@router.post("/me/fcm-token", status_code=status.HTTP_204_NO_CONTENT)
async def update_fcm_token(
    token_data: FCMTokenUpdate,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
    success = service.update_user_fcm_token(current_user.user_id, token_data.fcm_token)
    if not success:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update notification settings.")
    return

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_own_account(
    delete_request: UserDeleteRequest,
    current_user: UserInDB = Depends(get_current_user_from_db),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Allows a user to delete their own account.
    Notifications are sent to admins with the reason.
    """
    try:
        # 1. Notify Admins
        service.notify_admins_of_deletion(current_user, delete_request.reason)
        
        # 2. Delete User Data & Auth
        success = service.delete_user(current_user.user_id)
        
        if not success:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process account deletion.")
            
        return
    except Exception as e:
        print(f"Self-deletion error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error processing request: {e}")