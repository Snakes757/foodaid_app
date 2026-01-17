from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import datetime

class UserRole(str, Enum):
    DONOR = "Donor"
    RECEIVER = "Receiver"
    ADMIN = "Admin"
    LOGISTICS = "Logistics"

class PostStatus(str, Enum):
    AVAILABLE = "Available"
    RESERVED = "Reserved"
    COLLECTED = "Collected" # Pickup by Receiver
    IN_TRANSIT = "In Transit" # Pickup by Logistics
    DELIVERED = "Delivered" # Dropped off by Logistics
    EXPIRED = "Expired"

class DeliveryMethod(str, Enum):
    PICKUP = "Pickup"
    DELIVERY = "Delivery"

class VerificationStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude.")
    lng: float = Field(..., description="Longitude.")

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address.")
    role: UserRole = Field(..., description="User's role (Donor, Receiver, or Admin).")
    name: str = Field(..., description="Full name of the user or organization.")
    address: str = Field(..., description="User's full street address for geocoding.")
    phone_number: Optional[str] = Field(None, description="Contact phone number.")

    model_config = ConfigDict(extra='ignore')

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="User's password (min 6 characters).")

class UserCreateGoogle(UserBase):
    """Schema for creating a user profile via Google Auth (no password needed)."""
    pass

class UserInDB(UserBase):
    user_id: str = Field(..., description="Firebase Auth UID.")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    coordinates: Optional[Coordinates] = Field(None, description="Geocoded location.")
    verification_status: VerificationStatus = Field(default=VerificationStatus.PENDING)
    fcm_token: Optional[str] = Field(None, description="Firebase Cloud Messaging token for push notifications.")
    verification_document_url: Optional[str] = Field(None, description="URL to uploaded verification document (for Donors/Receivers).")
    verification_rejection_reason: Optional[str] = Field(None, description="Reason for rejection, if applicable.")

class UserPublic(UserBase):
    user_id: str = Field(..., description="Firebase Auth UID.")
    coordinates: Optional[Coordinates] = Field(None, description="Geocoded location.")
    verification_status: VerificationStatus = Field(..., description="Admin verification status.")

class TokenData(BaseModel):
    user_id: str = Field(..., alias="uid")
    email: Optional[EmailStr] = None
    model_config = ConfigDict(populate_by_name=True)

class FCMTokenUpdate(BaseModel):
    fcm_token: str = Field(..., description="New FCM token.")

class VerificationUpdate(BaseModel):
    user_id: str = Field(..., description="The user ID to update.")
    status: VerificationStatus = Field(..., description="The new verification status.")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection, if applicable.")

class FoodPostBase(BaseModel):
    title: str = Field(..., description="Title of the food post.")
    description: Optional[str] = Field(None, description="Detailed description of the food item(s).")
    quantity: str = Field(..., description="Estimated quantity (e.g., '1 box', 'approx 5kg').")
    address: str = Field(..., description="Pickup address for the food.")
    expiry: datetime.datetime = Field(..., description="Expiry date and time of the food item.")
    image_url: Optional[str] = Field(None, description="URL of the uploaded food post image.")

    model_config = ConfigDict(extra='ignore')

class FoodPostCreate(FoodPostBase):
    pass

class FoodPostInDB(FoodPostBase):
    post_id: str = Field(..., description="Unique ID of the post (document ID).")
    donor_id: str = Field(..., description="User ID of the donor.")
    status: PostStatus = Field(default=PostStatus.AVAILABLE, description="Current status of the post.")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    coordinates: Coordinates = Field(..., description="Geocoded location of the pickup address.")

    receiver_id: Optional[str] = Field(None, description="User ID of the receiver, if reserved.")
    reserved_at: Optional[datetime.datetime] = Field(None, description="Timestamp when the post was reserved.")
    delivery_method: Optional[DeliveryMethod] = Field(None, description="Chosen method: Pickup or Delivery.")

    logistics_id: Optional[str] = Field(None, description="User ID of the logistics driver.")
    picked_up_at: Optional[datetime.datetime] = Field(None, description="When driver picked up the food.")
    delivered_at: Optional[datetime.datetime] = Field(None, description="When driver delivered the food.")

    donor_details: Optional[UserPublic] = Field(None, description="Cached public details of the donor.")

class FoodPostPublic(FoodPostInDB):
    distance_km: Optional[float] = Field(None, description="Calculated distance from the user (if coords provided).")

class ReservationRequest(BaseModel):
    delivery_method: DeliveryMethod = Field(..., description="Receiver chooses Pickup or Delivery.")

class ReservationPublic(BaseModel):
    reservation_id: str
    post_id: str
    receiver_id: str
    donor_id: str
    timestamp: datetime.datetime
    status: str
    delivery_method: Optional[DeliveryMethod] = None
    post_details: Optional[FoodPostPublic] = None
    receiver_details: Optional[UserPublic] = None

class DonationRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Donation amount in cents.")
    currency: str = Field(default="usd", description="Currency code (e.g., 'usd', 'zar').")
    email: EmailStr = Field(..., description="Donor's email for receipt.")

class NotificationBase(BaseModel):
    title: str
    body: str
    user_id: str
    read: bool = False
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    data: Optional[Dict[str, Any]] = None

class NotificationPublic(NotificationBase):
    notification_id: str