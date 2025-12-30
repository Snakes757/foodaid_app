import base64
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional, Dict, Any

from app.schemas import DonationRequest, UserInDB
from app.config import settings
from app.dependencies import get_current_user_from_db, get_firebase_service
from app.services.firebase_service import FirebaseService

router = APIRouter()

# Helper to get PayPal Access Token
def get_paypal_access_token() -> str:
    """
    Exchanges Client ID and Secret for a PayPal Access Token.
    """
    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PayPal credentials are not configured on the server."
        )

    url = f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token"
    
    # Basic Auth: Base64 encode "client_id:client_secret"
    auth_header = base64.b64encode(
        f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response = requests.post(url, data={"grant_type": "client_credentials"}, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"PayPal Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate with PayPal."
        )

@router.post("/create-payment")
async def create_payment_order(
    donation: DonationRequest,
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """
    Creates a PayPal Order. 
    Returns the Order ID which the client uses to render the PayPal button.
    """
    access_token = get_paypal_access_token()
    url = f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders"

    # Convert amount from cents (integer) to major units (string, e.g., "10.00")
    amount_major = f"{donation.amount / 100:.2f}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": donation.currency.upper(),
                "value": amount_major
            },
            "description": "FoodAid Donation",
            "custom_id": current_user.user_id  # Link payment to user
        }],
        "payer": {
            "email_address": donation.email
        },
        "application_context": {
            "brand_name": "FoodAid",
            "user_action": "PAY_NOW"
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        order_data = response.json()
        
        # Return the Order ID and status so the frontend can start the flow
        return {
            "order_id": order_data["id"], 
            "status": order_data["status"],
            "links": order_data.get("links", [])
        }
        
    except Exception as e:
        print(f"PayPal Create Order Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating PayPal order: {e}"
        )

@router.post("/{order_id}/capture")
async def capture_payment(
    order_id: str,
    service: FirebaseService = Depends(get_firebase_service),
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """
    Captures the funds for a specific Order ID.
    This should be called after the user approves the payment on the client side.
    """
    access_token = get_paypal_access_token()
    url = f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers)
        response.raise_for_status()
        capture_data = response.json()

        # Check if completed successfully
        if capture_data.get("status") == "COMPLETED":
            # Extract transaction details to log to Firebase
            purchase_units = capture_data.get("purchase_units", [])
            if purchase_units:
                captures = purchase_units[0].get("payments", {}).get("captures", [])
                if captures:
                    transaction = captures[0]
                    
                    # Adapt data to fit the existing logging service
                    # We store amount in cents to maintain database consistency
                    amount_val = transaction.get("amount", {}).get("value", "0")
                    
                    payment_record = {
                        "id": transaction.get("id"),
                        "amount": int(float(amount_val) * 100), 
                        "status": transaction.get("status"),
                        "metadata": {
                            "order_id": order_id,
                            "user_id": current_user.user_id,
                            "email": current_user.email,
                            "provider": "paypal"
                        }
                    }
                    service.log_payment(payment_record)

        return capture_data

    except Exception as e:
        print(f"PayPal Capture Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error capturing PayPal payment: {e}"
        )

@router.post("/webhook")
async def paypal_webhook(
    request: Request,
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Handles PayPal webhook events (e.g., PAYMENT.CAPTURE.COMPLETED).
    """
    # Note: In a production environment, you MUST verify the PayPal-Transmission-Sig 
    # header to ensure authenticity. This example processes the payload directly.
    
    try:
        event = await request.json()
        event_type = event.get("event_type")

        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            resource = event.get("resource", {})
            amount_val = resource.get("amount", {}).get("value", "0")
            
            payment_record = {
                "id": resource.get("id"),
                "amount": int(float(amount_val) * 100),
                "status": resource.get("status"),
                "metadata": {
                    "provider": "paypal_webhook",
                    "event_id": event.get("id")
                }
            }
            service.log_payment(payment_record)

        return {"status": "received"}

    except Exception as e:
        print(f"Webhook Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")