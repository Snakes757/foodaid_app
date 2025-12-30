from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import datetime
from google.cloud.firestore_v1.client import Client

from app.schemas import FoodPostPublic, UserInDB, UserRole, PostStatus, DeliveryMethod
from app.config import get_db
from app.dependencies import get_current_verified_user, get_firebase_service
from app.services.firebase_service import FirebaseService

router = APIRouter()

@router.get("/available", response_model=List[FoodPostPublic])
async def get_available_deliveries(
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    service: FirebaseService = Depends(get_firebase_service)
):

    if current_user.role != UserRole.LOGISTICS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access restricted to Logistics users.")

    try:
        posts_ref = db.collection('foodPosts')

        query = posts_ref.where("status", "==", PostStatus.RESERVED)\
                         .where("delivery_method", "==", DeliveryMethod.DELIVERY)\
                         .where("logistics_id", "==", None)

        deliveries = []
        for doc in query.stream():
            data = doc.to_dict()
            if not data: continue

            data['post_id'] = doc.id

            if data.get('donor_id'):
                donor = service.get_user_by_uid(data['donor_id'])
                if donor:
                    data['donor_details'] = donor.model_dump()

            deliveries.append(FoodPostPublic.model_validate(data))

        return deliveries

    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error fetching deliveries: {e}")

@router.post("/{post_id}/accept", response_model=FoodPostPublic)
async def accept_delivery(
    post_id: str,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    service: FirebaseService = Depends(get_firebase_service)
):

    if current_user.role != UserRole.LOGISTICS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access restricted to Logistics users.")

    post_ref = db.collection('foodPosts').document(post_id)
    post_doc = post_ref.get()

    if not post_doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")

    data = post_doc.to_dict()
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post data is empty.")

    if data.get('logistics_id'):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This delivery has already been accepted by another driver.")

    if data.get('delivery_method') != DeliveryMethod.DELIVERY:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This post is set for Pickup, not Delivery.")

    try:

        post_ref.update({
            "logistics_id": current_user.user_id,
        })

        if data.get('receiver_id'):
            # We already checked 'data' is not None above, so this subscript is safe
            receiver_id = data['receiver_id'] 
            receiver = service.get_user_by_uid(receiver_id)
            if receiver:
                service.send_and_save_notification(
                    receiver.user_id,
                    "Driver Assigned",
                    f"A driver ({current_user.name}) has accepted your delivery.",
                    receiver.fcm_token
                )

        updated_doc = post_ref.get()
        updated_data = updated_doc.to_dict()
        if not updated_data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Failed to retrieve updated post.")

        return FoodPostPublic.model_validate({**updated_data, "post_id": updated_doc.id})

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error accepting delivery: {e}")

@router.put("/{post_id}/status", response_model=FoodPostPublic)
async def update_delivery_status(
    post_id: str,
    new_status: PostStatus,
    current_user: UserInDB = Depends(get_current_verified_user),
    db: Client = Depends(get_db),
    service: FirebaseService = Depends(get_firebase_service)
):

    if current_user.role != UserRole.LOGISTICS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access restricted.")

    if new_status not in [PostStatus.IN_TRANSIT, PostStatus.DELIVERED]:
         raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid status update for driver.")

    post_ref = db.collection('foodPosts').document(post_id)
    post_doc = post_ref.get()
    
    data = post_doc.to_dict()
    if not data:
         raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")

    if data.get('logistics_id') != current_user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not the assigned driver for this shipment.")

    # Explicitly type the dictionary to allow mixed types (Enum and Datetime)
    update_data: Dict[str, Any] = {"status": new_status}
    now = datetime.datetime.now(datetime.timezone.utc)

    # Initialize variables to prevent 'possibly unbound' errors
    msg_title: Optional[str] = None
    msg_body: Optional[str] = None

    if new_status == PostStatus.IN_TRANSIT:
        update_data["picked_up_at"] = now
        msg_title = "Food on the way"
        msg_body = "The driver has picked up the food."
    elif new_status == PostStatus.DELIVERED:
        update_data["delivered_at"] = now
        msg_title = "Food Delivered"
        msg_body = "Your food donation has arrived!"

    post_ref.update(update_data)

    if data.get('receiver_id'):
        receiver_id = data['receiver_id']
        receiver = service.get_user_by_uid(receiver_id)
        if receiver and msg_title and msg_body:
            service.send_and_save_notification(
                receiver.user_id, msg_title, msg_body, receiver.fcm_token
            )

    updated_doc = post_ref.get()
    updated_data = updated_doc.to_dict()
    if not updated_data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Failed to retrieve updated post.")

    return FoodPostPublic.model_validate({**updated_data, "post_id": updated_doc.id})