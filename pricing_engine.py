"""
pricing_engine.py — Pure-math margin optimizer for Mekatron.
No AI credits required. Uses supplier price list from Supabase.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import models
from decimal import Decimal


# ─── Volume Discount Tiers ────────────────────────────────────────────────────
# (quantity_min, quantity_max, discount_pct)
VOLUME_DISCOUNT_TIERS = [
    (1,   9,   0.00),   # 0% discount
    (10,  24,  0.03),   # 3% discount
    (25,  49,  0.05),   # 5% discount
    (50,  99,  0.08),   # 8% discount
    (100, 999, 0.12),   # 12% discount
]

LABOR_RATE_PER_UNIT = Decimal("15.00")   # AED 15 labor per unit (configurable)
OVERHEAD_RATE       = Decimal("0.05")    # 5% overhead on material cost


def get_volume_discount(quantity: int) -> float:
    """Return the discount fraction for a given quantity."""
    for min_q, max_q, discount in VOLUME_DISCOUNT_TIERS:
        if min_q <= quantity <= max_q:
            return discount
    return 0.12  # Max tier for quantities >= 100


def get_latest_supplier_price(
    db: Session,
    product_id: int,
    supplier_id: Optional[int] = None
) -> Optional[Decimal]:
    """
    Get the most recent supplier price for a product.
    If supplier_id is given, filter to that supplier only.
    Falls back to the product's base_price if no price list entry exists.
    """
    query = (
        db.query(models.SupplierPriceList)
        .filter(models.SupplierPriceList.product_id == product_id)
        .order_by(models.SupplierPriceList.effective_date.desc())
    )
    if supplier_id:
        query = query.filter(models.SupplierPriceList.supplier_id == supplier_id)

    price_entry = query.first()

    if price_entry:
        return Decimal(str(price_entry.price))

    # Fallback: base_price from products table
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product and product.base_price:
        return Decimal(str(product.base_price))

    return None


def calculate_item_cost(
    db: Session,
    product_id: int,
    quantity: int,
    supplier_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Calculate the full cost breakdown for one line item.
    Returns a dict with unit_cost, discount_pct, discounted_unit_cost,
    labor, overhead, subtotal, and the product name/sku.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        return {"error": f"Product {product_id} not found"}

    unit_cost = get_latest_supplier_price(db, product_id, supplier_id)
    if unit_cost is None:
        unit_cost = Decimal("0.00")

    discount_pct = Decimal(str(get_volume_discount(quantity)))
    discounted_unit_cost = unit_cost * (1 - discount_pct)
    labor = LABOR_RATE_PER_UNIT * quantity
    material_total = discounted_unit_cost * quantity
    overhead = material_total * OVERHEAD_RATE
    subtotal = material_total + labor + overhead

    return {
        "product_id": product_id,
        "product_name": product.name,
        "sku": product.sku,
        "category": product.category,
        "quantity": quantity,
        "unit_cost": float(unit_cost),
        "volume_discount_pct": float(discount_pct * 100),
        "discounted_unit_cost": float(discounted_unit_cost),
        "material_total": float(material_total),
        "labor": float(labor),
        "overhead": float(overhead),
        "subtotal": float(subtotal),
    }


def optimize_pricing(
    db: Session,
    items: List[Dict[str, Any]],   # [{product_id, quantity, supplier_id?}]
    margin_target: float,          # e.g. 0.20 for 20%
) -> Dict[str, Any]:
    """
    Main pricing optimization function.

    Given a list of items and a target margin percentage, this engine:
    1. Looks up the latest supplier cost for each product.
    2. Applies volume discounts.
    3. Adds labor and overhead.
    4. Computes the sell price needed to hit margin_target.
    5. Returns optimized line items + full cost breakdown + recommendations.
    """
    itemized = []
    total_cost = Decimal("0.00")
    warnings = []
    recommendations = []

    for item in items:
        product_id = item.get("product_id")
        quantity   = item.get("quantity", 1)
        supplier_id = item.get("supplier_id")

        cost_data = calculate_item_cost(db, product_id, quantity, supplier_id)

        if "error" in cost_data:
            warnings.append(cost_data["error"])
            continue

        total_cost += Decimal(str(cost_data["subtotal"]))

        # Volume discount nudge
        if quantity < 10:
            recommendations.append(
                f"Ordering ≥10 units of '{cost_data['product_name']}' "
                f"(currently {quantity}) would unlock a 3% volume discount."
            )

        itemized.append(cost_data)

    # Target margin formula: sell_price = cost / (1 - margin)
    margin = Decimal(str(margin_target))
    if margin >= 1:
        margin = Decimal("0.20")  # Safety cap — treat >100% as 20%
    
    if (1 - margin) == 0:
        sell_price = total_cost
    else:
        sell_price = total_cost / (1 - margin)

    actual_margin_pct = float(
        ((sell_price - total_cost) / sell_price * 100) if sell_price > 0 else 0
    )

    # Check if margin target is achievable; warn if cost is 0
    if total_cost == 0:
        warnings.append("Total cost is AED 0. Check that products have supplier prices set.")

    # Labor as a share — flag if labor > 40% of cost
    total_labor = sum(Decimal(str(i["labor"])) for i in itemized)
    if total_cost > 0 and (total_labor / total_cost) > Decimal("0.40"):
        recommendations.append(
            "Labor exceeds 40% of total cost. Consider bundling items to reduce per-unit labor."
        )

    return {
        "items": itemized,
        "itemized_costs": itemized,
        "material_total": float(sum(Decimal(str(i["material_total"])) for i in itemized)),
        "labor_total": float(total_labor),
        "overhead_total": float(sum(Decimal(str(i["overhead"])) for i in itemized)),
        "total_internal_cost": float(total_cost),
        "sell_price": float(sell_price),
        "currency": "AED",
        "margin_target": float(margin),
        "cost_breakdown": {
            "total_material": float(sum(Decimal(str(i["material_total"])) for i in itemized)),
            "total_labor":    float(total_labor),
            "total_overhead": float(sum(Decimal(str(i["overhead"])) for i in itemized)),
            "total_cost":     float(total_cost),
        },
        "pricing": {
            "target_margin_pct":  float(margin * 100),
            "sell_price":         float(sell_price),
            "actual_margin_pct":  actual_margin_pct,
            "margin_achieved":    actual_margin_pct >= float(margin * 100) - 0.01,
        },
        "warnings":        warnings,
        "recommendations": recommendations,
    }


def validate_requirements_against_template(
    db: Session,
    project_type: str,
    specifications: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Rule-based requirements validator.
    Loads validation_rules JSON from requirements_templates table
    and checks specifications against each rule.
    """
    template = (
        db.query(models.RequirementsTemplate)
        .filter(models.RequirementsTemplate.project_type == project_type)
        .first()
    )

    warnings = []
    errors = []

    if not template:
        return {
            "validation_status": "no_template",
            "message": f"No requirements template found for project type '{project_type}'.",
            "warnings": [],
            "errors": [],
        }

    # Check required fields
    if template.required_fields:
        required = [f.strip() for f in template.required_fields.split(",")]
        for field in required:
            if field not in specifications or specifications[field] is None:
                errors.append(f"Required field missing: '{field}'")

    # Apply JSON validation rules
    rules = template.validation_rules or []
    if isinstance(rules, list):
        for rule in rules:
            if not isinstance(rule, dict):
                continue
            field    = rule.get("field")
            operator = rule.get("operator")   # "gte", "lte", "in", "not_null"
            expected = rule.get("value")
            message  = rule.get("message", f"Rule failed for field '{field}'")
            severity = rule.get("severity", "warning")   # "error" or "warning"

            actual = specifications.get(field)
            failed = False

            if operator == "not_null" and actual is None:
                failed = True
            elif actual is None:
                pass  # Can't evaluate if field missing (already caught above)
            elif operator == "gte" and float(actual) < float(expected):
                failed = True
            elif operator == "lte" and float(actual) > float(expected):
                failed = True
            elif operator == "in" and actual not in expected:
                failed = True
            elif operator == "eq" and actual != expected:
                failed = True

            if failed:
                if severity == "error":
                    errors.append(message)
                else:
                    warnings.append(message)
    elif isinstance(rules, dict):
        if "allowed_finishes" in rules and "finish" in specifications:
            if specifications["finish"] not in rules["allowed_finishes"]:
                warnings.append(f"Finish '{specifications['finish']}' is non-standard for {project_type}. Standard options: {', '.join(rules['allowed_finishes'])}")
        if "min_fire_rating" in rules and "fire_rating" in specifications:
            spec_rating = str(specifications["fire_rating"]).lower()
            if "none" in spec_rating or "0" in spec_rating:
                errors.append(f"Project requires minimum fire rating of {rules['min_fire_rating']}")

    status = "failed" if errors else ("passed_with_warnings" if warnings else "passed")
    valid = len(errors) == 0

    # Find matching hardware sets for the project type
    matched_hardware = (
        db.query(models.HardwareSet)
        .filter(models.HardwareSet.category.ilike(f"%{project_type}%"))
        .limit(5)
        .all()
    )
    matched_hardware_data = [
        {"id": h.id, "name": h.name, "door_type": h.door_type, "category": h.category}
        for h in matched_hardware
    ]

    return {
        "validation_status": status,
        "valid": valid,
        "project_type": project_type,
        "matched_hardware": matched_hardware_data,
        "warnings": warnings,
        "errors": errors,
        "missing_required_fields": [e.split("'")[1] for e in errors if "Required field missing" in e],
        "rule_violations": [e for e in errors if "Required field missing" not in e],
        "summary": f"All {project_type} architectural specifications verified against building standards." if valid else f"Found {len(errors)} validation items requiring estimator review.",
    }
