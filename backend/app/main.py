import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, posts, reservations

app = FastAPI(
    title="FoodAid API",
    description="Backend API for the FoodAid surplus food distribution platform.",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:8081", # Default Expo Go port
    "exp://*", # Allow connections from Expo Go
    # Add your production frontend URLs here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- Include API Routers ---
app.include_router(auth.router, prefix="/auth", tags=["Authentication & Users"])
app.include_router(posts.router, prefix="/posts", tags=["Food Posts"])
app.include_router(reservations.router, prefix="/reservations", tags=["Reservations"])
# We will add routers for Admin, Notifications, and Payments in the next batches.
# app.include_router(admin.router, prefix="/admin", tags=["Admin"])
# app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
# app.include_router(payments.router, prefix="/payments", tags=["Payments"])
# ---------------------------

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the FoodAid API!"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )