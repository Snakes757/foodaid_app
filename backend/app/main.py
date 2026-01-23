import uvicorn
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.limiter import limiter
from app.routers import (
    auth, posts, reservations, admin,
    notifications, payments, logistics
)

app = FastAPI(
    title="FoodAid API",
    description="Backend API for the FoodAid surplus food distribution platform.",
    version="1.0.0"
)

# Initialize Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

origins = [
    "http://localhost",
    "http://localhost:8081", # Default Expo Go port
    "exp://*", # Allow connections from Expo Go
    "*" # Allow all for dev/testing ease
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER REGISTRATION ---
# Removed 'api_v1' wrapper to match client requests (e.g., /auth/register instead of /api/v1/auth/register)

app.include_router(auth.router, prefix="/auth", tags=["Authentication & Users"])
app.include_router(posts.router, prefix="/posts", tags=["Food Posts"])
app.include_router(reservations.router, prefix="/reservations", tags=["Reservations"])
app.include_router(logistics.router, prefix="/logistics", tags=["Logistics & Delivery"])
app.include_router(admin.router, prefix="/admin", tags=["Admin Control"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(payments.router, prefix="/payments", tags=["Donations & Payments"])

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "FastAPI is reachable"}

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": "Welcome to the FoodAid API!",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/admin", tags=["Admin"])
async def read_admin():
    return {
        "message": "Admin endpoint is accessible.",
        "status": "online"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )