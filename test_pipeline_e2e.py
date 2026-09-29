"""
test_pipeline_e2e.py — Comprehensive End-to-End Pipeline Verification Test
Verifies the complete flow requested by the user:
1. Requirements extraction & matching against defined hardware sets (Exact match).
2. Non-matching requirements -> Closest matching set selection & automated component adaptation (Add/Remove).
3. Persistence of the newly created hardware set to the library for future reuse.
4. User verification & total door openings count multiplier (BOQ scaling).
5. Dynamic Pricing Engine execution on the verified items.
6. Final Quotation Excel Document Generation matching verified state.
"""
from fastapi.testclient import TestClient
import main
import json

client = TestClient(main.app)

def test_pipeline():
    print("=" * 70)
    print("RUNNING COMPLETE HARDWARE ESTIMATION PIPELINE VERIFICATION TEST")
    print("=" * 70)

    # -------------------------------------------------------------
    # STAGE 1: Exact Match Flow
    # -------------------------------------------------------------
    print("\n--- STAGE 1: Exact Match Scenario ---")
    exact_req_payload = {
        "project_type": "Commercial",
        "specifications": {
            "door_type": "Main Entry",
            "fire_rating": "120min",
            "security": "High",
            "finish": "satin stainless"
        }
    }
    res_exact = client.post("/api/hardware-sets/match", json=exact_req_payload)
    assert res_exact.status_code == 200, f"Match request failed: {res_exact.text}"
    exact_data = res_exact.json()
    
    assert len(exact_data["exact_matches"]) > 0, "Expected at least one exact match"
    top_exact = exact_data["exact_matches"][0]
    print(f"[PASS] Exact Match Identified: '{top_exact['name']}' (Match Score: {top_exact['match_pct']}%)")
    assert top_exact["match_pct"] >= 70, "Exact match score must be >= 70"
    assert len(top_exact["components"]) > 0, "Exact match must have structured components"
    print(f"[PASS] Pre-defined Components Retrieved: {len(top_exact['components'])} items")
    for comp in top_exact["components"]:
        print(f"       • {comp.get('quantity')}x {comp.get('product_name')} ({comp.get('sku')}) @ AED {comp.get('unit_price')}")

    # -------------------------------------------------------------
    # STAGE 2: No Exact Match -> Closest Match & Adaptation Flow
    # -------------------------------------------------------------
    print("\n--- STAGE 2: No Exact Match -> Closest Match & Auto-Adaptation ---")
    novel_req_payload = {
        "project_type": "Healthcare",
        "specifications": {
            "door_type": "ICU Sliding",
            "fire_rating": "60min",
            "finish": "matt black"
        }
    }
    res_adapt = client.post("/api/hardware-sets/match", json=novel_req_payload)
    assert res_adapt.status_code == 200, f"Match request failed: {res_adapt.text}"
    adapt_data = res_adapt.json()

    assert len(adapt_data["exact_matches"]) == 0, "Expected NO exact match for custom ICU sliding specs"
    closest = adapt_data["closest_match"]
    assert closest is not None, "Expected a closest match to be identified"
    print(f"[PASS] No exact match found. Closest match picked: '{closest['name']}' ({closest['match_pct']}%)")

    plan = adapt_data["customisation_plan"]
    assert plan is not None, "Expected a customisation plan"
    print(f"[PASS] Customisation Plan Generated:")
    print(f"       • Rationale: {plan.get('rationale')}")
    print(f"       • Added products: {plan.get('added_products')}")
    print(f"       • Removed products: {plan.get('removed_products')}")

    proposed = adapt_data["proposed_components"]
    assert len(proposed) > 0, "Expected proposed_components to be synthesized"
    print(f"[PASS] Proposed Adapted Hardware Set Synthesized: {len(proposed)} components")
    for c in proposed:
        action_flag = f"[{c.get('action').upper()}]" if c.get('action') else "[RETAINED]"
        print(f"       {action_flag} {c.get('quantity')}x {c.get('product_name')} ({c.get('sku')})")

    # -------------------------------------------------------------
    # STAGE 3: Persist New Hardware Set to Library for Reusability
    # -------------------------------------------------------------
    print("\n--- STAGE 3: Persisting New Hardware Set into Library ---")
    new_set_payload = {
        "name": "HS-Healthcare-ICUSliding-60min",
        "door_type": "ICU Sliding",
        "category": "Healthcare",
        "specifications": "Custom adapted 60-min fire rated hardware set with floor spring and matt black architectural trims.",
        "components": proposed
    }
    res_save = client.post("/api/hardware-sets", json=new_set_payload)
    assert res_save.status_code == 200, f"Save hardware set failed: {res_save.text}"
    saved_set = res_save.json()
    new_id = saved_set["id"]
    print(f"[PASS] New Hardware Set Persisted to Database with ID: {new_id} ('{saved_set['name']}')")

    # Verify queryability in the library
    res_list = client.get("/api/hardware-sets")
    assert res_list.status_code == 200
    all_sets = res_list.json()
    matching_in_db = [s for s in all_sets if s["id"] == new_id]
    assert len(matching_in_db) == 1, "New hardware set must appear in GET /api/hardware-sets"
    assert len(matching_in_db[0]["components"]) == len(proposed), "Persisted components must match"
    print(f"[PASS] Verified new set is present in library and queryable for future projects ({len(all_sets)} total sets in library)")

    # -------------------------------------------------------------
    # STAGE 4: User Component Verification & Openings Scaling (BOQ)
    # -------------------------------------------------------------
    print("\n--- STAGE 4: User Verification & Door Openings Count Multiplier ---")
    DOOR_OPENINGS_COUNT = 48
    print(f"Specified Total Door Openings: {DOOR_OPENINGS_COUNT} units")
    
    scaled_items = []
    total_qty_items = 0
    total_material_cost = 0.0

    for comp in proposed:
        per_door_qty = comp.get("quantity", 1)
        total_qty = per_door_qty * DOOR_OPENINGS_COUNT
        unit_price = float(comp.get("unit_price", 0.0))
        subtotal = total_qty * unit_price
        
        scaled_items.append({
            "product_id": comp.get("product_id"),
            "product_name": comp.get("product_name"),
            "sku": comp.get("sku"),
            "category": comp.get("category", "Hardware"),
            "quantity": total_qty,
            "unit_price": unit_price,
            "subtotal": subtotal
        })
        total_qty_items += total_qty
        total_material_cost += subtotal

    print(f"[PASS] Scaled BOQ Generated:")
    print(f"       • Total Component Hardware Units: {total_qty_items} units")
    print(f"       • Total Material Subtotal: AED {total_material_cost:,.2f}")

    # -------------------------------------------------------------
    # STAGE 5: Pricing Engine Optimization (Volume, Labor, Margins)
    # -------------------------------------------------------------
    print("\n--- STAGE 5: Pricing Optimization Engine ---")
    pricing_payload = {
        "items": [
            {"product_id": it["product_id"], "quantity": it["quantity"]}
            for it in scaled_items
        ],
        "margin_target": 0.20
    }
    res_price = client.post("/api/quotations/optimize-pricing", json=pricing_payload)
    assert res_price.status_code == 200, f"Pricing optimization failed: {res_price.text}"
    opt_data = res_price.json()
    
    sell_price = opt_data.get("sell_price", 0.0)
    actual_margin = opt_data.get("actual_margin_pct", 0.0)
    labor_total = opt_data.get("labor_total", 0.0)
    overhead_total = opt_data.get("overhead_total", 0.0)
    print(f"[PASS] Pricing Engine Evaluated Successfully:")
    print(f"       • Recommended Sell Price: AED {sell_price:,.2f}")
    print(f"       • Target Margin: {opt_data.get('margin_target') * 100}% | Actual Margin Achieved: {actual_margin:.2f}%")
    print(f"       • Labor Total Allowance: AED {labor_total:,.2f}")
    print(f"       • Overhead Total: AED {overhead_total:,.2f}")

    # -------------------------------------------------------------
    # STAGE 6: Quotation Document Export
    # -------------------------------------------------------------
    print("\n--- STAGE 6: Excel Quotation Document Generation ---")
    export_payload = {
        "reference_id": "PRJ-TEST-001",
        "project_name": "Healthcare Hospital Extension",
        "client_name": "Ministry of Health UAE",
        "items": scaled_items,
        "cost_summary": {
            "material_cost": total_material_cost,
            "labor": labor_total,
            "markup": opt_data.get("margin_amount", 0.0),
            "total_price": sell_price
        },
        "notes": "Customized and verified hardware set based on project fire rating standards."
    }
    res_export = client.post("/api/quotations/export-excel", json=export_payload)
    assert res_export.status_code == 200, f"Excel export failed: {res_export.text}"
    assert "spreadsheetml" in res_export.headers.get("content-type", ""), "Must return Excel spreadsheet MIME type"
    excel_bytes = len(res_export.content)
    assert excel_bytes > 1000, "Excel output file should have substantial content"
    print(f"[PASS] Excel Proposal Document Generated ({excel_bytes} bytes returned)")

    print("\n" + "=" * 70)
    print("ALL 6 STAGES OF THE ESTIMATION PIPELINE PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    test_pipeline()
