from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import datetime
from google.cloud.firestore_v1.client import Client

from app.schemas import (
    FoodPostCreate, FoodPostPublic, PostStatus,
    UserInDB, UserRole, Coordinates, UserPublic
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
    fb_service: FirebaseService = Depends(get_firebase_service), # Added for fetching donor details
    lat: Optional[float] = Query(None, description="User's latitude for distance sorting."),
    lng: Optional[float] = Query(None, description="User's longitude for distance sorting.")
):
    """
    Gets all 'Available' posts that have not expired.
    If lat/lng are provided, results are sorted by distance.
    Otherwise, sorted by creation date.
    """
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        posts_ref = db.collection('foodPosts')
        query = posts_ref.where("status", "==", PostStatus.AVAILABLE).where("expiry", ">", now)

        available_posts_data = []
        user_coords = None
        if lat is not None and lng is not None:
            user_coords = Coordinates(lat=lat, lng=lng)

        donor_cache: dict[str, Optional[UserPublic]] = {}

        for doc in query.stream():
            post_data = doc.to_dict()
            if not post_data:  # Skip if doc.to_dict() is None
                continue
                
            post_data["post_id"] = doc.id

            # Fetch and cache donor details
            donor_id = post_data.get("donor_id")
            if donor_id:
                if donor_id not in donor_cache:
                    donor_user = fb_service.get_user_by_uid(donor_id)
                    donor_cache[donor_id] = UserPublic.model_validate(donor_user.model_dump()) if donor_user else None
                post_data["donor_details"] = donor_cache[donor_id]

            # Calculate distance if user coords are provided
            if user_coords:
                post_coords_data = post_data.get("coordinates")
                if post_coords_data:
                    post_coords = Coordinates.model_validate(post_coords_data)
                    distance = maps_service.calculate_distance_km(user_coords, post_coords)
                    post_data["distance_km"] = distance
                else:
                    post_data["distance_km"] = float('inf')
            
            available_posts_data.append(post_data)

        # Sort results
        if user_coords:
            available_posts_data.sort(key=lambda p: p.get("distance_km", float('inf')))
        else:
            # Sort by created_at descending (newest first)
            available_posts_data.sort(key=lambda p: p.get("created_at"), reverse=True)
        
        # Validate and return
        return [FoodPostPublic.model_validate(post) for post in available_posts_data]

    except Exception as e:
        print(f"Error fetching posts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching posts: {e}"
        )

@router.post("/", response_model=FoodPostPublic, status_code=status.HTTP_201_CREATED)
async def create_new_post(
    post_data: FoodPostCreate,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    maps_service: GoogleMapsService = Depends(get_maps_service),
    fb_service: FirebaseService = Depends(get_firebase_service)
):
    """
    Creates a new food post. Only accessible by verified Donors.
    """
    if current_user.role != UserRole.DONOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Donors are allowed to create new posts."
        )

    try:
        # Geocode the provided address
        coordinates = maps_service.get_coordinates_for_address(post_data.address)
        if not coordinates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not find coordinates for address: {post_data.address}. Please try a more specific address."
            )

        new_post_data = post_data.model_dump()
        new_post_data.update({
            "donor_id": current_user.user_id,
            "status": PostStatus.AVAILABLE,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "coordinates": coordinates.model_dump(),
            "receiver_id": None,
            "reserved_at": None,
            "donor_details": UserPublic.model_validate(current_user.model_dump()) # Add donor details on creation
        })

        # Add to Firestore
        update_time, doc_ref = db.collection('foodPosts').add(new_post_data)
        new_post_data["post_id"] = doc_ref.id

        # Return the created post, validated by the response model
        return FoodPostPublic.model_validate(new_post_data)

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error creating post: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating post: {e}"
        )

@router.get("/me", response_model=List[FoodPostPublic])
async def get_my_posts(
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    fb_service: FirebaseService = Depends(get_firebase_service) # Added
):
    """
    Gets all posts created by the currently authenticated user (Donor).
    """
    try:
        posts_ref = db.collection('foodPosts')
        query = posts_ref.where("donor_id", "==", current_user.user_id)

        my_posts = []
        # Pre-fetch and cache donor's own details
        donor_details = UserPublic.model_validate(current_user.model_dump())

        for doc in query.stream():
            post_data = doc.to_dict()
            if not post_data: # Safety check
                continue
                
            post_data["post_id"] = doc.id
            post_data["donor_details"] = donor_details # Add self as donor
            my_posts.append(FoodPostPublic.model_validate(post_data))

        my_posts.sort(key=lambda p: p.created_at, reverse=True)
        return my_posts

    except Exception as e:
        print(f"Error fetching user's posts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user's posts: {e}"
        )

@router.put("/{post_id}/reserve", response_model=FoodPostPublic)
async def reserve_post(
    post_id: str,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    fb_service: FirebaseService = Depends(get_firebase_service) # Added
):
    """
    Reserves an 'Available' food post. Only accessible by verified Receivers.
    """
    if current_user.role != UserRole.RECEIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Receivers are allowed to reserve posts."
        )

    post_ref = db.collection('foodPosts').document(post_id)
    try:
        post_doc = post_ref.get()
        if not post_doc.exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Food post not found.")

        post_data = post_doc.to_dict()
        if not post_data: # Safety check
             raise HTTPException(status.HTTP_404_NOT_FOUND, "Food post data is empty.")

        if post_data.get("status") != PostStatus.AVAILABLE:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This post is no longer available.")

        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Check expiry
        expiry_time = post_data.get("expiry")
        if expiry_time and expiry_time <= now:
            post_ref.update({"status": PostStatus.EXPIRED})
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This post has expired.")

        # Update post status
        update_data = {
            "status": PostStatus.RESERVED,
            "receiver_id": current_user.user_id,
            "reserved_at": now
        }
        post_ref.update(update_data)

        # Create a reservation record
        reservation_data = {
            "post_id": post_id,
            "receiver_id": current_user.user_id,
            "donor_id": post_data.get("donor_id"),
            "timestamp": now,
            "status": "Active" # "Active", "Completed", "Cancelled"
        }
        db.collection('reservations').add(reservation_data)

        # Prepare response
        post_data.update(update_data)
        post_data["post_id"] = post_id
        
        # Add donor details if not present
        if "donor_details" not in post_data:
             donor_id = post_data.get("donor_id")
             if donor_id:
                donor_user = fb_service.get_user_by_uid(donor_id)
                post_data["donor_details"] = UserPublic.model_validate(donor_user.model_dump()) if donor_user else None

        return FoodPostPublic.model_validate(post_data)

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Error reserving post: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error reserving post: {e}")

@router.put("/{post_id}/collected", response_model=FoodPostPublic)
async def mark_post_collected(
    post_id: str,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    fb_service: FirebaseService = Depends(get_firebase_service) # Added
):
    """
    Marks a 'Reserved' post as 'Collected'.
    Accessible by the Donor who posted it or the Receiver who reserved it.
    """
    post_ref = db.collection('foodPosts').document(post_id)
    try:
        post_doc = post_ref.get()
        if not post_doc.exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Food post not found.")

        post_data = post_doc.to_dict()
        if not post_data: # Safety check
             raise HTTPException(status.HTTP_404_NOT_FOUND, "Food post data is empty.")

        # Check authorization
        is_donor = current_user.role == UserRole.DONOR and post_data.get("donor_id") == current_user.user_id
        is_receiver = current_user.role == UserRole.RECEIVER and post_data.get("receiver_id") == current_user.user_id

        if not (is_donor or is_receiver):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not authorized to update this post.")

        if post_data.get("status") != PostStatus.RESERVED:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only a 'Reserved' post can be 'Collected'.")

        # Update post status
        update_data = {"status": PostStatus.COLLECTED}
        post_ref.update(update_data)

        # Find the active reservation and mark it 'Completed'
        res_query = db.collection('reservations').where("post_id", "==", post_id).where("status", "==", "Active")
        res_docs = list(res_query.stream())
        if res_docs:
            res_doc_ref = res_docs[0].reference
            res_doc_ref.update({"status": "Completed"})
        
        # Prepare response
        post_data.update(update_data)
        post_data["post_id"] = post_id

        # Add donor details if not present
        if "donor_details" not in post_data:
             donor_id = post_data.get("donor_id")
             if donor_id:
                donor_user = fb_service.get_user_by_uid(donor_id)
                post_data["donor_details"] = UserPublic.model_validate(donor_user.model_dump()) if donor_user else None
        
        return FoodPostPublic.model_validate(post_data)

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Error marking post as collected: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error marking post as collected: {e}")