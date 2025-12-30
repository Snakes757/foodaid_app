import requests
from app.config import settings
from app.schemas import Coordinates
from typing import Optional
from geopy.distance import geodesic

class GoogleMapsService:

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_SERVER_API_KEY # Use specific key for server
        self.geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"

    def get_coordinates_for_address(self, address: str) -> Optional[Coordinates]:

        if not self.api_key:
            print("Warning: GOOGLE_MAPS_SERVER_API_KEY is not set. Geocoding skipped.")
            # For dev purposes, return dummy coords if key missing? 
            # Better to return None and let caller handle.
            return None

        if not address:
            return None

        params = {
            "address": address,
            "key": self.api_key
        }

        try:
            response = requests.get(self.geocode_url, params=params)
            response.raise_for_status()
            data = response.json()

            if data["status"] == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return Coordinates(lat=location["lat"], lng=location["lng"])
            else:
                print(f"Geocoding failed for '{address}': {data.get('status')}")
                return None
        except requests.RequestException as e:
            print(f"Google Maps API Request Error: {e}")
            return None
        except Exception as e:
            print(f"Geocoding Logic Error: {e}")
            return None

    def calculate_distance_km(self, coord1: Coordinates, coord2: Coordinates) -> float:
        if not coord1 or not coord2:
            return float('inf')

        point1 = (coord1.lat, coord1.lng)
        point2 = (coord2.lat, coord2.lng)

        try:
            distance = geodesic(point1, point2).kilometers
            return distance
        except Exception as e:
            print(f"Distance calculation error: {e}")
            return float('inf')