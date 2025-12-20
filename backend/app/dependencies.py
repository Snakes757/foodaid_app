from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.services.firebase_service import FirebaseService
from app.schemas import TokenData, UserInDB, UserRole, VerificationStatus, UserPublic
from typing import Optional

security_scheme = HTTPBearer()

def get_firebase_service():
    return FirebaseService()

async def get_current_user_data(
    creds: HTTPAuthorizationCredentials = Depends(security_scheme),
    service: FirebaseService = Depends(get_firebase_service)
) -> TokenData:
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization credentials provided"
        )
    token = creds.credentials
    try:
        payload = service.verify_firebase_token(token)
        
        uid = payload.get("uid")
        if not uid:
            # This should not happen with a valid Firebase token
            raise ValueError("Invalid token: UID not found in payload.")
            
        return TokenData(uid=uid, email=payload.get("email"))
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying token: {e}"
        )

async def get_current_user_from_db(
    token_data: TokenData = Depends(get_current_user_data),
    service: FirebaseService = Depends(get_firebase_service)
) -> UserInDB:
    try:
        # Use user_id (which is aliased to uid)
        user_doc = service.get_user_by_uid(token_data.user_id) 
        if user_doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in Firestore. Please complete registration."
            )
        return user_doc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {e}"
        )

async def get_current_verified_user(
    current_user: UserInDB = Depends(get_current_user_from_db)
) -> UserInDB:
    if current_user.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not yet verified. Please wait for admin approval."
        )
    return current_user

async def get_current_admin_user(
    current_user: UserInDB = Depends(get_current_user_from_db)
) -> UserInDB:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges."
        )
    return current_user