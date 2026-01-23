import base64
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional, Dict, Any, List

from app.schemas import DonationRequest, UserInDB, DisbursementRequest, SystemBalance
from app.config import settings
from app.dependencies import get_current_user_from_db, get_firebase_service, get_current_admin_user
from app.services.firebase_service import FirebaseService

router = APIRouter()

# --- HELPER FUNCTIONS ---
def get_paypal_access_token() -> str:
    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PayPal credentials are not configured on the server."
        )

    url = f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token"
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

# --- PUBLIC/DONOR ENDPOINTS ---

@router.post("/create-payment")
async def create_payment_order(
    donation: DonationRequest,
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """Initiates a payment order for a donation (Visible only to Admin eventually)."""
    access_token = get_paypal_access_token()
    url = f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders"

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
            "custom_id": current_user.user_id
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

        return {
            "order_id": order_data["id"],
            "status": order_data["status"],
            "links": order_data.get("links", [])
        }
    except Exception as e:
        print(f"PayPal Create Order Error: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating PayPal order: {e}")

@router.post("/{order_id}/capture")
async def capture_payment(
    order_id: str,
    service: FirebaseService = Depends(get_firebase_service),
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """Captures the funds after user approves on PayPal."""
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

        if capture_data.get("status") == "COMPLETED":
            purchase_units = capture_data.get("purchase_units", [])
            if purchase_units:
                captures = purchase_units[0].get("payments", {}).get("captures", [])
                if captures:
                    transaction = captures[0]
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
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error capturing PayPal payment: {e}")

# --- ADMIN ENDPOINTS ---

@router.get("/admin/balance", response_model=SystemBalance)
async def get_system_balance(
    admin: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    """Visible ONLY to Admins: View total donations and disbursements."""
    total_in = service.get_total_donations()
    total_out = service.get_total_disbursements()
    
    return SystemBalance(
        total_donated=total_in,
        total_disbursed=total_out,
        current_balance=total_in - total_out
    )

@router.post("/admin/disburse")
async def disburse_funds(
    request: DisbursementRequest,
    admin: UserInDB = Depends(get_current_admin_user),
    service: FirebaseService = Depends(get_firebase_service)
):
    """Visible ONLY to Admins: Record a manual disbursement to an NGO."""
    
    # 1. Check Balance
    total_in = service.get_total_donations()
    total_out = service.get_total_disbursements()
    current_balance = total_in - total_out
    
    if request.amount > current_balance:
         raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Insufficient funds in donation pool.")
    
    # 2. Check Receiver existence
    receiver = service.get_user_by_uid(request.receiver_id)
    if not receiver or receiver.role != "Receiver":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Receiver not found or invalid role.")
        
    if not receiver.banking_details:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Receiver has no banking details set up.")

    # 3. Record Disbursement
    success = service.record_disbursement(
        admin_id=admin.user_id,
        receiver_id=request.receiver_id,
        amount=request.amount,
        reference=request.reference
    )
    
    if not success:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record disbursement.")
        
    return {"status": "success", "message": "Disbursement recorded and user notified."}