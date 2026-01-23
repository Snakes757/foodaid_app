from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from google.cloud.firestore import Client, FieldFilter
from google.api_core.exceptions import FailedPrecondition

from app.schemas import NotificationPublic, UserInDB
from app.config import get_db
from app.dependencies import get_current_user_from_db

router = APIRouter()

@router.get("/", response_model=List[NotificationPublic])
async def get_my_notifications(
    current_user: UserInDB = Depends(get_current_user_from_db),
    db: Client = Depends(get_db)
):
    try:
        notif_ref = db.collection('notifications')
        
        # Use FieldFilter to suppress UserWarnings
        query = notif_ref.where(filter=FieldFilter("user_id", "==", current_user.user_id))\
                         .order_by("created_at", direction="DESCENDING")

        notifications = []
        for doc in query.stream():
            data = doc.to_dict()
            data['notification_id'] = doc.id
            notifications.append(NotificationPublic.model_validate(data))

        return notifications

    except FailedPrecondition as e:
        print(f"FIRESTORE INDEX REQUIRED for Notifications: {e.message}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Notifications index missing. Check server logs."
        )
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        # Fallback (inefficient but works without index) if the query fails completely
        try:
            print("Attempting fallback notification fetch (without sort)...")
            query = notif_ref.where(filter=FieldFilter("user_id", "==", current_user.user_id))
            results = []
            for doc in query.stream():
                data = doc.to_dict()
                data['notification_id'] = doc.id
                results.append(NotificationPublic.model_validate(data))

            results.sort(key=lambda x: x.created_at, reverse=True)
            return results
        except Exception as inner_e:
             raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error fetching notifications: {inner_e}")

@router.put("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user_from_db),
    db: Client = Depends(get_db)
):
    doc_ref = db.collection('notifications').document(notification_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")

    if doc.to_dict().get("user_id") != current_user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your notification.")

    doc_ref.update({"read": True})
    return