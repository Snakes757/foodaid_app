from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from google.cloud.firestore_v1.client import Client

from app.schemas import NotificationPublic, UserInDB
from app.config import get_db
from app.dependencies import get_current_user_from_db

router = APIRouter()

@router.get("/", response_model=List[NotificationPublic])
async def get_my_notifications(
    current_user: UserInDB = Depends(get_current_user_from_db),
    db: Client = Depends(get_db)
):
    """
    Fetch the user's notification history.
    """
    try:
        # Query notifications where user_id matches
        notif_ref = db.collection('notifications')
        query = notif_ref.where("user_id", "==", current_user.user_id)\
                         .order_by("created_at", direction="DESCENDING")
        
        # Firestore composite indexes might be required for filtering + sorting.
        # If index error occurs, remove order_by or create index in Firebase Console.
        
        notifications = []
        for doc in query.stream():
            data = doc.to_dict()
            data['notification_id'] = doc.id
            notifications.append(NotificationPublic.model_validate(data))
            
        return notifications
        
    except Exception as e:
        # Fallback if index missing: fetch then sort in python
        print(f"Index error possible: {e}")
        try:
            query = notif_ref.where("user_id", "==", current_user.user_id)
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
    """
    Mark a specific notification as read.
    """
    doc_ref = db.collection('notifications').document(notification_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
        
    if doc.to_dict().get("user_id") != current_user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your notification.")
        
    doc_ref.update({"read": True})
    return