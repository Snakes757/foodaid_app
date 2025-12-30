from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import datetime
from google.cloud.firestore_v1.client import Client

from app.schemas import (
    FoodPostCreate, FoodPostPublic, PostStatus,
    UserInDB, UserRole, Coordinates, UserPublic, ReservationRequest, DeliveryMethod
)
from app.config import get_db
from app.dependencies import get_current_verified_user, get_firebase_service
from app.services.firebase_service import FirebaseService
from app.services.google_maps import GoogleMapsService

router = APIRouter()

def get_maps_service():
    return GoogleMapsService()

@router.get("/", response_model=List[FoodPostPublic])
async def get_available_posts(
    db: Client = Depends(get_db),
    maps_service: GoogleMapsService = Depends(get_maps_service),
    fb_service: FirebaseService = Depends(get_firebase_service),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None)
):
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        posts_ref = db.collection('foodPosts')
        query = posts_ref.where("status", "==", PostStatus.AVAILABLE).where("expiry", ">", now)

        available_posts_data = []
        user_coords = None
        if lat is not None and lng is not None:
            user_coords = Coordinates(lat=lat, lng=lng)

        # Basic optimization: fetch donor details in batch or cache if possible (omitted for brevity)
        
        for doc in query.stream():
            post_data = doc.to_dict()
            if not post_data: continue
            post_data["post_id"] = doc.id

            # Fill donor details
            donor_id = post_data.get("donor_id")
            if donor_id:
                donor_user = fb_service.get_user_by_uid(donor_id)
                post_data["donor_details"] = UserPublic.model_validate(donor_user.model_dump()) if donor_user else None

            # Calculate distance
            if user_coords:
                post_coords_data = post_data.get("coordinates")
                if post_coords_data:
                    post_coords = Coordinates.model_validate(post_coords_data)
                    distance = maps_service.calculate_distance_km(user_coords, post_coords)
                    post_data["distance_km"] = distance
                else:
                    post_data["distance_km"] = float('inf')
            
            available_posts_data.append(post_data)

        if user_coords:
            available_posts_data.sort(key=lambda p: p.get("distance_km", float('inf')))
        else:
            available_posts_data.sort(key=lambda p: p.get("created_at"), reverse=True)

        return [FoodPostPublic.model_validate(post) for post in available_posts_data]

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error fetching posts: {e}")

@router.post("/", response_model=FoodPostPublic, status_code=status.HTTP_201_CREATED)
async def create_new_post(
    post_data: FoodPostCreate,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    maps_service: GoogleMapsService = Depends(get_maps_service),
    fb_service: FirebaseService = Depends(get_firebase_service)
):
    if current_user.role != UserRole.DONOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Donors can create posts.")

    try:
        # 1. Geocode
        coordinates = maps_service.get_coordinates_for_address(post_data.address)
        if not coordinates:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid address.")

        # 2. Prepare Data
        new_post_data = post_data.model_dump()
        new_post_data.update({
            "donor_id": current_user.user_id,
            "status": PostStatus.AVAILABLE,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "coordinates": coordinates.model_dump(),
            "donor_details": UserPublic.model_validate(current_user.model_dump()),
            "delivery_method": None, # Set upon reservation
            "logistics_id": None
        })

        # 3. Save to Firestore
        update_time, doc_ref = db.collection('foodPosts').add(new_post_data)
        new_post_data["post_id"] = doc_ref.id

        # 4. Trigger Notifications (Async)
        # We invoke the service to find nearby receivers/logistics and notify them
        fb_service.notify_nearby_users_of_new_post(new_post_data)

        return FoodPostPublic.model_validate(new_post_data)

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Error creating post: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error creating post: {e}")

@router.put("/{post_id}/reserve", response_model=FoodPostPublic)
async def reserve_post(
    post_id: str,
    reservation_request: ReservationRequest,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    fb_service: FirebaseService = Depends(get_firebase_service)
):
    if current_user.role != UserRole.RECEIVER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Receivers can reserve posts.")

    post_ref = db.collection('foodPosts').document(post_id)
    post_doc = post_ref.get()
    
    if not post_doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
        
    post_data = post_doc.to_dict()
    if post_data.get("status") != PostStatus.AVAILABLE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Post not available.")

    now = datetime.datetime.now(datetime.timezone.utc)
    
    update_data = {
        "status": PostStatus.RESERVED,
        "receiver_id": current_user.user_id,
        "reserved_at": now,
        "delivery_method": reservation_request.delivery_method
    }
    
    # Update Post
    post_ref.update(update_data)
    
    # Create Reservation Record
    db.collection('reservations').add({
        "post_id": post_id,
        "receiver_id": current_user.user_id,
        "donor_id": post_data.get("donor_id"),
        "timestamp": now,
        "status": "Active",
        "delivery_method": reservation_request.delivery_method
    })
    
    # Notify Donor
    donor_id = post_data.get("donor_id")
    if donor_id:
        donor = fb_service.get_user_by_uid(donor_id)
        if donor:
            msg = f"{current_user.name} has reserved your food."
            if reservation_request.delivery_method == DeliveryMethod.DELIVERY:
                msg += " A driver will be assigned shortly."
            else:
                msg += " They will pick it up personally."
                
            fb_service.send_and_save_notification(donor.user_id, "Food Reserved", msg, donor.fcm_token)

    # Return updated post
    updated_doc = post_ref.get()
    return FoodPostPublic.model_validate({**updated_doc.to_dict(), "post_id": updated_doc.id})