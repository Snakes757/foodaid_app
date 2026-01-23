from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas import UserPublic, VerificationUpdate, UserInDB, UserPublicWithBank
from app.services.firebase_service import FirebaseService
from app.dependencies import get_current_admin_user, get_firebase_service

router = APIRouter()

@router.get("/users/pending", response_model=List[UserPublic])
async def get_pending_verification_users(
    admin_user: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    try:
        pending_users = service.get_pending_users()
        return [UserPublic.model_validate(user.model_dump()) for user in pending_users]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching pending users: {e}"
        )

@router.get("/users", response_model=List[UserPublicWithBank])
async def get_all_users(
    admin_user: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Returns all users. Includes banking details for admins to view.
    """
    try:
        users = service.get_all_users()
        # Admin can see banking details, so we use UserPublicWithBank schema
        return [UserPublicWithBank.model_validate(user.model_dump()) for user in users]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {e}"
        )

@router.post("/users/verify", response_model=UserPublic)
async def verify_user(
    update_data: VerificationUpdate,
    admin_user: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    try:
        updated_user = service.update_user_verification_status(
            update_data.user_id,
            update_data.status,
            update_data.rejection_reason
        )

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {update_data.user_id} not found."
            )

        return UserPublic.model_validate(updated_user.model_dump())

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user verification: {e}"
        )