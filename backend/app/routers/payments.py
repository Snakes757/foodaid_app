import stripe
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from google.cloud.firestore_v1.client import Client
from typing import Optional

from app.schemas import DonationRequest, UserInDB
from app.config import settings, get_db
from app.dependencies import get_current_user_from_db
from app.services.firebase_service import FirebaseService
from app.dependencies import get_firebase_service # Corrected import

router = APIRouter()

# Set Stripe API key, but check if it exists first
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    print("Warning: STRIPE_SECRET_KEY is not set. Payment endpoints will fail.")

@router.post("/create-payment-intent")
async def create_payment_intent(
    donation: DonationRequest,
    current_user: UserInDB = Depends(get_current_user_from_db)
):
    """
    Creates a Stripe Payment Intent for a donation.
    """
    if not stripe.api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured on the server."
        )

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=donation.amount, # Amount in cents
            currency=donation.currency,
            automatic_payment_methods={"enabled": True},
            receipt_email=donation.email,
            metadata={
                "user_id": current_user.user_id,
                "user_email": current_user.email,
                "user_name": current_user.name
            }
        )
        return {"client_secret": payment_intent.client_secret}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment intent: {e}"
        )

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None),
    service: FirebaseService = Depends(get_firebase_service)
):
    """
    Handles incoming webhooks from Stripe, specifically for
    'payment_intent.succeeded' events to log donations.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing 'Stripe-Signature' header.")

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe webhook secret is not configured."
        )

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=stripe_signature, secret=settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payload: {e}")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid signature: {e}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Webhook error: {e}")

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        # Log the successful payment
        service.log_payment(payment_intent)
    else:
        print(f"Unhandled event type: {event['type']}")

    return {"status": "success"}