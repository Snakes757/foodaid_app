from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.schemas import UserPublic, VerificationUpdate, UserInDB
from app.services.firebase_service import FirebaseService
from app.dependencies import get_current_admin_user, get_firebase_service

router = APIRouter()

@router.get("/users/pending", response_model=List[UserPublic])
async def get_pending_verification_users(
    admin_user: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Retrieves a list of all users whose verification status is 'Pending'.
    Only accessible by an Admin user.
    """
    try:
        pending_users = service.get_pending_users()
        # Convert UserInDB objects to UserPublic
        return [UserPublic.model_validate(user.model_dump()) for user in pending_users]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching pending users: {e}"
        )

@router.post("/users/verify", response_model=UserPublic)
async def verify_user(
    update_data: VerificationUpdate,
    admin_user: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Updates a user's verification status (Approve or Reject).
    Sends a push notification to the user upon update.
    Only accessible by an Admin user.
    """
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

        # Send push notification if the user has an FCM token
        if updated_user.fcm_token:
            title = "Account Verification Update"
            body = f"Your account has been {updated_user.verification_status.value}."
            if update_data.rejection_reason and updated_user.verification_status == updated_user.verification_status.REJECTED:
                body += f" Reason: {update_data.rejection_reason}"
            
            service.send_push_notification(title, body, updated_user.fcm_token)

        return UserPublic.model_validate(updated_user.model_dump())

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user verification: {e}"
        )