"""
test_integration.py — End-to-End Verification Test for Mekatron Proposal Platform
Tests all core FastAPI endpoints, SQLAlchemy DB models, Pricing Engine, and Document Generator.
"""
from fastapi.testclient import TestClient
import main
import os

client = TestClient(main.app)

def run_tests():
    print("=" * 60)
    print("MEKATRON END-TO-END INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Health Check
    res = client.get("/")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Health Check & AI Status Endpoint")

    # 2. Products List & Search
    res = client.get("/api/products")
    assert res.status_code == 200 and len(res.json()) > 0, "Products list failed"
    print(f"[PASS] 2. Products List ({len(res.json())} products found)")

    res = client.get("/api/products/search?query=Deadbolt")
    assert res.status_code == 200 and len(res.json().get("matched_products", [])) > 0
    print("[PASS] 3. Product Search (Keyword / Semantic Fallback)")

    # 3. Suppliers List
    res = client.get("/api/suppliers")
    assert res.status_code == 200 and len(res.json()) > 0
    print(f"[PASS] 4. Suppliers List ({len(res.json())} suppliers)")

    # 4. Hardware Sets & Door Forms
    res = client.get("/api/hardware-sets")
    assert res.status_code == 200 and len(res.json()) > 0
    print(f"[PASS] 5. Hardware Sets Library ({len(res.json())} sets)")

    res = client.get("/api/libraries/door-sets")
    assert res.status_code == 200 and res.json().get("count", 0) > 0
    print(f"[PASS] 6. Door Forms Library ({res.json().get('count')} forms)")

    # 5. Requirements Validation
    res = client.post("/api/requirements/validate", json={
        "project_type": "Commercial",
        "specifications": {
            "fire_rating": "120min",
            "security_level": "High",
            "finish": "Satin Stainless Steel",
            "door_count": 48
        }
    })
    assert res.status_code == 200
    val_data = res.json()
    print(f"[PASS] 7. Requirements Validation (Valid={val_data.get('valid')})")

    # 6. Pricing Optimization Engine
    res = client.post("/api/quotations/optimize-pricing", json={
        "items": [
            {"product_id": 1, "quantity": 48},
            {"product_id": 2, "quantity": 48},
            {"product_id": 3, "quantity": 48},
        ],
        "margin_target": 0.20
    })
    assert res.status_code == 200
    opt_data = res.json()
    print(f"[PASS] 8. Pricing Margin Optimizer (Sell Price: AED {opt_data.get('sell_price'):,.2f})")

    # 7. Quotation Generation
    res = client.post("/api/quotations/generate", json={"enquiry_id": 1, "generate_type": "full"})
    assert res.status_code == 200
    q_data = res.json()
    q_id = q_data.get("quotation_id")
    print(f"[PASS] 9. AI Quotation Generation (Quotation #{q_id}, status: {q_data.get('draft_status')})")

    # 8. HTML Quotation Preview
    res = client.get(f"/api/quotations/{q_id}/preview")
    assert res.status_code == 200 and "text/html" in res.headers.get("content-type", "")
    print(f"[PASS] 10. HTML Quotation Document Rendered (Jinja2)")

    # 9. PDF Quotation Download
    res = client.get(f"/api/quotations/{q_id}/download-pdf")
    assert res.status_code == 200 and "application/pdf" in res.headers.get("content-type", "")
    print(f"[PASS] 11. PDF Quotation Document Generated (fpdf2)")

    print("=" * 60)
    print("ALL 11 INTEGRATION TESTS PASSED SUCCESSFULLY! Demo ready.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
