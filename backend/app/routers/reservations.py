from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from google.cloud.firestore_v1.client import Client

from app.schemas import (
    ReservationPublic, UserInDB, FoodPostPublic, UserRole,
    UserPublic, DeliveryMethod
)
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

        if current_user.role == UserRole.RECEIVER:
            query = reservations_ref.where("receiver_id", "==", current_user.user_id)
        elif current_user.role == UserRole.DONOR:
            query = reservations_ref.where("donor_id", "==", current_user.user_id)
        else:
            return []

        my_reservations = []

        post_cache = {}
        user_cache = {}

        for doc in query.stream():
            res_data = doc.to_dict()
            if not res_data: continue

            res_data["reservation_id"] = doc.id

            post_id = res_data.get("post_id")
            if post_id:
                if post_id not in post_cache:
                    p_doc = db.collection('foodPosts').document(post_id).get()
                    
                    # Fix: Initialize p_data to None first
                    p_data = None
                    
                    if p_doc.exists:
                        p_data = p_doc.to_dict()

                    # Fix: Explicitly check if p_data is not None before subscripting
                    if p_data:
                        p_data['post_id'] = p_doc.id

                        d_id = p_data.get("donor_id")
                        if d_id and d_id not in user_cache:
                            u = fb_service.get_user_by_uid(d_id)
                            user_cache[d_id] = UserPublic.model_validate(u.model_dump()) if u else None

                        if d_id: 
                            p_data["donor_details"] = user_cache.get(d_id)

                        post_cache[post_id] = FoodPostPublic.model_validate(p_data)
                    else:
                        post_cache[post_id] = None

                res_data["post_details"] = post_cache.get(post_id)

            if current_user.role == UserRole.DONOR:
                rec_id = res_data.get("receiver_id")
                if rec_id:
                    if rec_id not in user_cache:
                        u = fb_service.get_user_by_uid(rec_id)
                        user_cache[rec_id] = UserPublic.model_validate(u.model_dump()) if u else None
                    res_data["receiver_details"] = user_cache.get(rec_id)

            if "delivery_method" not in res_data:
                # Fallback to post delivery method if not stored on reservation
                if res_data.get("post_details"):
                    res_data["delivery_method"] = res_data["post_details"].delivery_method

            my_reservations.append(ReservationPublic.model_validate(res_data))

        my_reservations.sort(key=lambda r: r.timestamp, reverse=True)
        return my_reservations

    except Exception as e:
        print(f"Error fetching reservations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reservations: {e}"
        )