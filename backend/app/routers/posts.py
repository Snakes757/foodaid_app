from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional
import datetime
from google.cloud.firestore import Client, FieldFilter
from google.api_core.exceptions import FailedPrecondition

from app.schemas import (
    FoodPostCreate, FoodPostPublic, PostStatus,
    UserInDB, UserRole, Coordinates, UserPublic, ReservationRequest, DeliveryMethod
)
from app.config import get_db
from app.dependencies import get_current_verified_user, get_firebase_service
from app.services.firebase_service import FirebaseService
from app.services.google_maps import GoogleMapsService
from app.limiter import limiter

router = APIRouter()

def get_maps_service():
    return GoogleMapsService()

@router.get("/", response_model=List[FoodPostPublic])
@limiter.limit("60/minute")
async def get_available_posts(
    request: Request,
    db: Client = Depends(get_db),
    maps_service: GoogleMapsService = Depends(get_maps_service),
    fb_service: FirebaseService = Depends(get_firebase_service),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None)
):
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        posts_ref = db.collection('foodPosts')

        # Complex query: might need composite index
        query = posts_ref.where(filter=FieldFilter("status", "==", PostStatus.AVAILABLE))\
                         .where(filter=FieldFilter("expiry", ">", now))

        available_posts_data = []
        user_coords = None
        if lat is not None and lng is not None:
            user_coords = Coordinates(lat=lat, lng=lng)

        for doc in query.stream():
            post_data = doc.to_dict()
            if not post_data: continue
            post_data["post_id"] = doc.id

            # Populate donor details if missing or simple ID
            donor_id = post_data.get("donor_id")
            if donor_id:
                # In a real high-scale app, you'd batch fetch these or rely on 'donor_details' being embedded
                donor_user = fb_service.get_user_by_uid(donor_id)
                post_data["donor_details"] = UserPublic.model_validate(donor_user.model_dump()) if donor_user else None

            # Calculate distance if user coords provided
            if user_coords:
                post_coords_data = post_data.get("coordinates")
                if post_coords_data:
                    post_coords = Coordinates.model_validate(post_coords_data)
                    distance = maps_service.calculate_distance_km(user_coords, post_coords)
                    post_data["distance_km"] = distance
                else:
                    post_data["distance_km"] = float('inf')

            available_posts_data.append(post_data)

        # Sort by distance if coords provided, else by newest
        if user_coords:
            available_posts_data.sort(key=lambda p: p.get("distance_km", float('inf')))
        else:
            available_posts_data.sort(key=lambda p: p.get("created_at"), reverse=True)

        return [FoodPostPublic.model_validate(post) for post in available_posts_data]

    except FailedPrecondition as e:
        print(f"FIRESTORE INDEX REQUIRED: {e.message}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Database index missing. Check server logs for the creation link."
        )
    except Exception as e:
        print(f"Error fetching posts: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error fetching posts: {e}")

@router.post("/", response_model=FoodPostPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_new_post(
    request: Request,
    post_data: FoodPostCreate,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    maps_service: GoogleMapsService = Depends(get_maps_service),
    fb_service: FirebaseService = Depends(get_firebase_service)
):
    if current_user.role != UserRole.DONOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only Donors can create posts.")

    try:
        # Geocode the address
        coordinates = maps_service.get_coordinates_for_address(post_data.address)
        if not coordinates:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid address.")

        new_post_data = post_data.model_dump()
        
        # FIX: Ensure donor_details is converted to a dictionary, not a Pydantic Object
        donor_details_obj = UserPublic.model_validate(current_user.model_dump())
        donor_details_dict = donor_details_obj.model_dump()

        new_post_data.update({
            "donor_id": current_user.user_id,
            "status": PostStatus.AVAILABLE,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "coordinates": coordinates.model_dump(),
            "donor_details": donor_details_dict, # <--- FIXED: Now passing a dict
            "delivery_method": None,
            "logistics_id": None
        })

        update_time, doc_ref = db.collection('foodPosts').add(new_post_data)
        new_post_data["post_id"] = doc_ref.id

        # Notify nearby users
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

    # Update post status
    update_data = {
        "status": PostStatus.RESERVED,
        "receiver_id": current_user.user_id,
        "reserved_at": now,
        "delivery_method": reservation_request.delivery_method
    }

    post_ref.update(update_data)

    # Create reservation record
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

    # If Delivery requested, notify Logistics
    if reservation_request.delivery_method == DeliveryMethod.DELIVERY:
        notification_payload = post_data.copy()
        notification_payload['post_id'] = post_id
        fb_service.notify_logistics_of_new_job(notification_payload)

    updated_doc = post_ref.get()
    return FoodPostPublic.model_validate({**updated_doc.to_dict(), "post_id": updated_doc.id})