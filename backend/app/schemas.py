from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import datetime

# Enums

class UserRole(str, Enum):
    DONOR = "Donor"
    RECEIVER = "Receiver"
    ADMIN = "Admin"

class PostStatus(str, Enum):
    AVAILABLE = "Available"
    RESERVED = "Reserved"
    COLLECTED = "Collected"
    EXPIRED = "Expired"

class VerificationStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

# Core Models

class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude.")
    lng: float = Field(..., description="Longitude.")

# User Models

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address.")
    role: UserRole = Field(..., description="User's role (Donor, Receiver, or Admin).")
    name: str = Field(..., description="Full name of the user or organization.")
    address: str = Field(..., description="User's full street address for geocoding.")
    phone_number: Optional[str] = Field(None, description="Contact phone number.")
    
    # Add config to allow extra fields from Firestore (like verification_rejection_reason)
    model_config = ConfigDict(extra='ignore')


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="User's password (min 6 characters).")

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

#Auth & Token Models 

class TokenData(BaseModel):
    user_id: str = Field(..., alias="uid") # Alias 'uid' from token to 'user_id'
    email: Optional[EmailStr] = None
    
    model_config = ConfigDict(populate_by_name=True) # Allow population by alias

class FCMTokenUpdate(BaseModel):
    fcm_token: str = Field(..., description="New FCM token.")

class VerificationUpdate(BaseModel):
    user_id: str = Field(..., description="The user ID to update.")
    status: VerificationStatus = Field(..., description="The new verification status.")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection, if applicable.")

# Food Post Models

class FoodPostBase(BaseModel):
    title: str = Field(..., description="Title of the food post.")
    description: Optional[str] = Field(None, description="Detailed description of the food item(s).")
    quantity: str = Field(..., description="Estimated quantity (e.g., '1 box', 'approx 5kg').")
    address: str = Field(..., description="Pickup address for the food.")
    expiry: datetime.datetime = Field(..., description="Expiry date and time of the food item.")
    image_url: Optional[str] = Field(None, description="URL of the uploaded food post image.")
    
    # Add config to allow extra fields from Firestore
    model_config = ConfigDict(extra='ignore')

class FoodPostCreate(FoodPostBase):
    pass

class FoodPostInDB(FoodPostBase):
    post_id: str = Field(..., description="Unique ID of the post (document ID).")
    donor_id: str = Field(..., description="User ID of the donor.")
    status: PostStatus = Field(default=PostStatus.AVAILABLE, description="Current status of the post.")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now) # Corrected: default_factory
    coordinates: Coordinates = Field(..., description="Geocoded location of the pickup address.")

    receiver_id: Optional[str] = Field(None, description="User ID of the receiver, if reserved.")
    reserved_at: Optional[datetime.datetime] = Field(None, description="Timestamp when the post was reserved.")
    
    donor_details: Optional[UserPublic] = Field(None, description="Cached public details of the donor.")


class FoodPostPublic(FoodPostInDB):
    # donor_details is already in FoodPostInDB, no need to redefine
    distance_km: Optional[float] = Field(None, description="Calculated distance from the user (if coords provided).")
    pass

#Reservation Models

class Reservation(BaseModel):
    reservation_id: str
    post_id: str
    receiver_id: str
    donor_id: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now) # Corrected: default_factory
    status: str = Field(default="Active") # 'Active', 'Completed', 'Cancelled'
    
    model_config = ConfigDict(extra='ignore')


class ReservationPublic(Reservation):
    post_details: Optional[FoodPostPublic] = Field(None, description="Details of the reserved post.")
    receiver_details: Optional[UserPublic] = Field(None, description="Public details of the receiver (for donors).")

# --- Payment Models ---

class DonationRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Donation amount in cents (or smallest currency unit).")
    currency: str = Field(default="usd", description="Currency code (e.g., 'usd', 'zar').")
    email: EmailStr = Field(..., description="Donor's email for receipt.")