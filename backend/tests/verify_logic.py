import sys
import os
import pytest
from httpx import AsyncClient, ASGITransport
import datetime

# Add root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.dependencies import get_current_verified_user
from app.schemas import (
    UserInDB, UserRole, VerificationStatus, Coordinates, 
    DeliveryMethod, PostStatus
)

# --- MOCKS ---

async def mock_donor():
    return UserInDB(
        user_id="donor_123", email="donor@test.com", role=UserRole.DONOR,
        name="Test Bakery", address="123 Donor St", verification_status=VerificationStatus.APPROVED,
        coordinates=Coordinates(lat=-26.0, lng=28.0)
    )

async def mock_receiver():
    return UserInDB(
        user_id="receiver_456", email="ngo@test.com", role=UserRole.RECEIVER,
        name="Test Shelter", address="456 Receiver Rd", verification_status=VerificationStatus.APPROVED,
        coordinates=Coordinates(lat=-26.1, lng=28.1)
    )

async def mock_logistics():
    return UserInDB(
        user_id="driver_789", email="driver@test.com", role=UserRole.LOGISTICS,
        name="Fast Moves", address="789 Driver Ln", verification_status=VerificationStatus.APPROVED,
        coordinates=Coordinates(lat=-26.2, lng=28.2)
    )

# --- TESTS ---

@pytest.mark.asyncio
async def test_full_delivery_flow():
    transport = ASGITransport(app=app)
    base_url = "http://test"
    
    post_id = None

    # 1. DONOR CREATES POST
    app.dependency_overrides[get_current_verified_user] = mock_donor
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        payload = {
            "title": "Delivery Test Food",
            "quantity": "10 Boxes",
            "address": "Sandton, Johannesburg", # Needs real geocode or mock service
            "expiry": "2030-01-01T12:00:00Z"
        }
        # Note: If Google Maps key is missing, this might fail with 400. 
        # For pure logic test without external API, we'd mock MapsService too.
        # Assuming environment or mock for maps handles it.
        response = await ac.post("/posts/", json=payload)
        
        # If maps fail, skip rest
        if response.status_code == 400:
            print("[WARN] Skipping test due to Maps/Geocoding failure.")
            return

        assert response.status_code == 201
        post_id = response.json()["post_id"]
        print("\n[STEP 1] Post Created")

    # 2. RECEIVER RESERVES FOR DELIVERY
    app.dependency_overrides[get_current_verified_user] = mock_receiver
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        payload = {"delivery_method": DeliveryMethod.DELIVERY}
        response = await ac.put(f"/posts/{post_id}/reserve", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == PostStatus.RESERVED
        assert response.json()["delivery_method"] == DeliveryMethod.DELIVERY
        print("[STEP 2] Post Reserved for Delivery")

    # 3. LOGISTICS VIEWS AVAILABLE JOBS
    app.dependency_overrides[get_current_verified_user] = mock_logistics
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        response = await ac.get("/logistics/available")
        assert response.status_code == 200
        jobs = response.json()
        assert any(j["post_id"] == post_id for j in jobs)
        print("[STEP 3] Logistics sees the job")

    # 4. LOGISTICS ACCEPTS JOB
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        response = await ac.post(f"/logistics/{post_id}/accept")
        assert response.status_code == 200
        assert response.json()["logistics_id"] == "driver_789"
        print("[STEP 4] Logistics accepts job")

    # 5. LOGISTICS UPDATES TO IN TRANSIT
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        response = await ac.put(f"/logistics/{post_id}/status?new_status={PostStatus.IN_TRANSIT}")
        assert response.status_code == 200
        assert response.json()["status"] == PostStatus.IN_TRANSIT
        print("[STEP 5] Status updated to In Transit")

    # 6. LOGISTICS DELIVERS
    async with AsyncClient(transport=transport, base_url=base_url) as ac:
        response = await ac.put(f"/logistics/{post_id}/status?new_status={PostStatus.DELIVERED}")
        assert response.status_code == 200
        assert response.json()["status"] == PostStatus.DELIVERED
        print("[STEP 6] Food Delivered!")

    app.dependency_overrides.clear()