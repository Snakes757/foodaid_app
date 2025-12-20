from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from google.cloud.firestore_v1.client import Client

from app.schemas import ReservationPublic, UserInDB, FoodPostPublic, UserRole, UserPublic
from app.config import get_db
from app.dependencies import get_current_verified_user, get_firebase_service
from app.services.firebase_service import FirebaseService

router = APIRouter()

@router.get("/me", response_model=List[ReservationPublic])
async def get_my_reservations(
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    fb_service: FirebaseService = Depends(get_firebase_service)
):

    try:
        reservations_ref = db.collection('reservations')
        query = None

        if current_user.role == UserRole.RECEIVER:
            query = reservations_ref.where("receiver_id", "==", current_user.user_id)
        elif current_user.role == UserRole.DONOR:
            query = reservations_ref.where("donor_id", "==", current_user.user_id)
        else:
            return [] # Admins see no reservations via this endpoint

        my_reservations = []

        post_cache: dict[str, Optional[FoodPostPublic]] = {}
        user_cache: dict[str, Optional[UserPublic]] = {}

        for doc in query.stream():
            res_data = doc.to_dict()
            if not res_data: # Safety check
                continue

            res_data["reservation_id"] = doc.id

            post_id = res_data.get("post_id")
            post_details: Optional[FoodPostPublic] = None
            if post_id:
                if post_id not in post_cache:
                    post_ref = db.collection('foodPosts').document(post_id)
                    post_doc = post_ref.get()
                    if post_doc.exists:
                        post_data = post_doc.to_dict()
                        if post_data:
                            post_data["post_id"] = post_doc.id

                            donor_id = post_data.get("donor_id")
                            
                            if "donor_details" not in post_data and isinstance(donor_id, str):
                                if donor_id not in user_cache:
                                    donor = fb_service.get_user_by_uid(donor_id)
                                    user_cache[donor_id] = UserPublic.model_validate(donor.model_dump()) if donor else None
                                post_data["donor_details"] = user_cache[donor_id]

                            post_cache[post_id] = FoodPostPublic.model_validate(post_data)
                post_details = post_cache.get(post_id)
            res_data["post_details"] = post_details

            if current_user.role == UserRole.DONOR:
                receiver_id = res_data.get("receiver_id")
                if isinstance(receiver_id, str):
                    if receiver_id not in user_cache:
                         receiver = fb_service.get_user_by_uid(receiver_id)
                         user_cache[receiver_id] = UserPublic.model_validate(receiver.model_dump()) if receiver else None
                    res_data["receiver_details"] = user_cache[receiver_id]

            my_reservations.append(ReservationPublic.model_validate(res_data))

        my_reservations.sort(key=lambda r: r.timestamp, reverse=True)
        return my_reservations

    except Exception as e:
        print(f"Error fetching user's reservations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user's reservations: {e}"
        )