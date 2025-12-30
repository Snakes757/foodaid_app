from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.firebase_service import FirebaseService
from app.schemas import TokenData, UserInDB, UserRole, VerificationStatus

security_scheme = HTTPBearer()

def get_firebase_service():
    return FirebaseService()

async def get_current_user_data(
    creds: HTTPAuthorizationCredentials = Depends(security_scheme),
    service: FirebaseService = Depends(get_firebase_service)
) -> TokenData:
    """
    Validates the Firebase Bearer Token and extracts UID.
    """
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization credentials provided"
        )
    
    try:
        token = creds.credentials
        payload = service.verify_firebase_token(token)
        uid = payload.get("uid")
        
        if not uid:
            raise ValueError("No UID in token.")
            
        return TokenData(uid=uid, email=payload.get("email"))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_from_db(
    token_data: TokenData = Depends(get_current_user_data),
    service: FirebaseService = Depends(get_firebase_service)
) -> UserInDB:
    """
    Fetches the full user profile from Firestore.
    """
    user_doc = service.get_user_by_uid(token_data.user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please register."
        )
    return user_doc

async def get_current_verified_user(
    current_user: UserInDB = Depends(get_current_user_from_db)
) -> UserInDB:
    """
    Ensures the user's account is verified by Admin.
    """
    if current_user.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account not verified. Status: {current_user.verification_status}"
        )
    return current_user

async def get_current_admin_user(
    current_user: UserInDB = Depends(get_current_user_from_db)
) -> UserInDB:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user