import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("--- Testing Backend Endpoints ---")
    
    # 1. Hardware Sets Match (Our new endpoint)
    print("\n1. Testing /api/hardware-sets/match")
    payload = {
        "project_type": "Commercial",
        "specifications": {
            "fire_rating": "120min",
            "door_type": "Main Entry",
            "security": "High",
            "finish": "satin stainless"
        }
    }
    try:
        res = requests.post(f"{BASE_URL}/api/hardware-sets/match", json=payload)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Exact matches: {len(data['exact_matches'])}")
            if data['closest_match']:
                print(f"Closest match: {data['closest_match']['name']} ({data['closest_match']['match_pct']}%)")
        else:
            print(res.text)
    except Exception as e:
        print(f"Failed: {e}")

    # 2. Requirements Validate
    print("\n2. Testing /api/requirements/validate")
    payload2 = {
        "project_type": "Commercial",
        "specifications": {
            "door_type": "Main Entry",
            "fire_rating": "120min"
        }
    }
    try:
        res = requests.post(f"{BASE_URL}/api/requirements/validate", json=payload2)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print(f"Valid: {res.json().get('valid')}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == '__main__':
    run_tests()
