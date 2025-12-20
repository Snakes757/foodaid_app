import requests
from app.config import settings
from app.schemas import Coordinates
from typing import Optional
from geopy.distance import geodesic

class GoogleMapsService:

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"

    def get_coordinates_for_address(self, address: str) -> Optional[Coordinates]:
        """
        Geocodes a string address using Google Maps API.
        Returns Coordinates or None.
        """
        if not self.api_key:
            print("Error: GOOGLE_MAPS_API_KEY is not set. Cannot geocode.")
            return None
            
        if not address:
            print("Warning: No address provided to geocode.")
            return None

        params = {
            "address": address,
            "key": self.api_key
        }

        try:
            response = requests.get(self.geocode_url, params=params)
            response.raise_for_status() # Raise an exception for bad status codes
            data = response.json()

            if data["status"] == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return Coordinates(lat=location["lat"], lng=location["lng"])
            else:
                print(f"Geocoding failed for address '{address}'. Status: {data.get('status')}, Error: {data.get('error_message')}")
                return None
        except requests.RequestException as e:
            print(f"Error calling Google Maps API: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during geocoding: {e}")
            return None

    def calculate_distance_km(self, coord1: Coordinates, coord2: Coordinates) -> float:
        """
        Calculates the geodesic distance between two Coordinates objects.
        Returns distance in kilometers.
        """
        if not coord1 or not coord2:
            return float('inf')

        point1 = (coord1.lat, coord1.lng)
        point2 = (coord2.lat, coord2.lng)

        try:
            # Use geopy for accurate distance calculation
            distance = geodesic(point1, point2).kilometers
            return distance
        except Exception as e:
            print(f"Error calculating distance: {e}")
            return float('inf')