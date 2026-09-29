"""
hardware_set_matcher.py — Hardware Set Matching Engine for Mekatron.

Given extracted project requirements (project_type + specifications dict),
this engine scores every hardware set in the database and returns:
  - exact_matches: sets with score >= 70 (directly usable)
  - closest_match: the best scoring set below 70 (needs customisation)
  - customisation_plan: what to add / remove to bring closest_match to spec
  - all_scored: full ranked list for transparency

No AI credits required — pure keyword/rule-based scoring.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import models


# --- Component Keyword Map ---
# Maps requirement key/value patterns to expected hardware component terms.
REQUIREMENT_TO_COMPONENTS = {
    "60min":  ["fire-rated", "60 min", "60min", "fire door", "intumescent"],
    "90min":  ["fire-rated", "90 min", "90min", "fire door", "intumescent"],
    "120min": ["fire-rated", "120 min", "120min", "fire door", "intumescent"],
    "high":         ["mortise lock", "mortise", "high security", "grade 1", "deadbolt"],
    "medium":       ["lever set", "lever", "standard lock"],
    "low":          ["lever", "knob", "passage"],
    "main entry":   ["mortise lock", "closer", "panic bar", "3 hinges"],
    "interior":     ["lever set", "2 hinges"],
    "fire exit":    ["panic bar", "fire-rated", "closer", "3 hinges"],
    "front door":   ["deadbolt", "lever", "3 hinges"],
    "double leaf":  ["coordinator", "flush bolts", "meeting stile"],
    "sliding":      ["floor spring", "patch fitting"],
    "glass":        ["patch fitting", "floor spring", "pull handle"],
    "self-closing": ["closer", "floor spring", "overhead closer"],
    "closer":       ["closer", "floor spring"],
    "satin stainless": ["satin stainless", "sss", "stainless steel"],
    "polished chrome":  ["polished chrome", "cp"],
    "matt black":       ["matt black", "ral9005"],
    "pvd gold":         ["pvd gold", "gold"],
    "panic":       ["panic bar", "panic device", "push bar", "emergency exit"],
    "emergency":   ["panic bar", "emergency exit"],
    "commercial":  ["commercial", "mortise", "closer", "panic"],
    "residential": ["residential", "lever", "deadbolt"],
    "healthcare":  ["ligature resistant", "closer", "lever", "privacy"],
    "education":   ["closer", "lever set", "deadbolt"],
}

SPEC_COMPONENT_KEYWORDS = [
    "mortise lock", "mortise", "lever set", "lever", "deadbolt", "knob",
    "closer", "floor spring", "overhead closer",
    "hinge", "hinges",
    "panic bar", "panic device", "push bar",
    "coordinator", "flush bolts",
    "pull handle", "patch fitting",
    "surface bolt", "cabin hook",
    "electric strike", "electromagnetic",
    "access control",
    "fire-rated", "intumescent", "fire door",
    "sss", "stainless steel", "chrome", "matt black",
]


def _score_hardware_set(hw, project_type, specifications, required_components):
    score = 0
    reasons = []
    spec_text = (hw.specifications or "").lower()

    if hw.category and project_type.lower() in hw.category.lower():
        score += 40
        reasons.append(f"Category '{hw.category}' matches project type '{project_type}'")

    door_type_req = (
        specifications.get("door_type") or
        specifications.get("doorType") or
        specifications.get("door_form") or ""
    ).lower()
    hw_door = (hw.door_type or "").lower()

    if door_type_req and hw_door:
        if door_type_req in hw_door or hw_door in door_type_req:
            score += 30
            reasons.append(f"Door type '{hw.door_type}' matches requirement '{door_type_req}'")
        elif any(word in hw_door for word in door_type_req.split()):
            score += 15
            reasons.append(f"Partial door type match: '{hw.door_type}'")

    component_hits = []
    for comp in required_components:
        if comp.lower() in spec_text:
            component_hits.append(comp)
            score += 3
    if component_hits:
        reasons.append(f"Components found in spec: {', '.join(component_hits)}")

    score = min(score, 100)

    return {
        "id": hw.id,
        "name": hw.name,
        "door_type": hw.door_type,
        "category": hw.category,
        "specifications": hw.specifications,
        "components": hw.components or [],
        "score": score,
        "match_pct": score,
        "is_exact_match": score >= 70,
        "reasons": reasons,
        "component_hits": component_hits,
    }


def _resolve_required_components(project_type, specifications):
    components = set()
    for term in REQUIREMENT_TO_COMPONENTS.get(project_type.lower(), []):
        components.add(term)
    for key, value in specifications.items():
        val_str = str(value).lower().strip() if value else ""
        key_str = key.lower().strip()
        for pattern, comps in REQUIREMENT_TO_COMPONENTS.items():
            if pattern in val_str or pattern in key_str:
                for c in comps:
                    components.add(c)
    return list(components)


def _build_customisation_plan(db, hw, required_components):
    import copy
    spec_text = (hw.get("specifications") or "").lower()
    base_components = copy.deepcopy(hw.get("components") or [])
    
    add = []
    for comp in required_components:
        # Check if already in spec text or existing components
        already_has = comp.lower() in spec_text or any(comp.lower() in str(c.get("product_name", "")).lower() or comp.lower() in str(c.get("category", "")).lower() for c in base_components)
        if not already_has:
            add.append(comp)

    remove = []
    for kw in SPEC_COMPONENT_KEYWORDS:
        if kw in spec_text:
            covered = any(kw in rc.lower() or rc.lower() in kw for rc in required_components)
            if not covered:
                remove.append(kw)

    # Build proposed components by modifying base components
    proposed_components = []
    removed_items = []
    for comp in base_components:
        name_cat = (comp.get("product_name", "") + " " + comp.get("category", "")).lower()
        should_remove = False
        for rem_kw in remove:
            if rem_kw in name_cat:
                should_remove = True
                break
        if should_remove:
            removed_items.append(comp.get("product_name"))
        else:
            proposed_components.append(comp)

    # Add missing required components from the database catalog
    added_items = []
    all_products = db.query(models.Product).all()
    for add_kw in add:
        # Check if already present in proposed_components
        exists = any(add_kw in (c.get("product_name", "") + " " + c.get("category", "")).lower() for c in proposed_components)
        if not exists:
            # Find best matching product
            matched_prod = None
            for p in all_products:
                p_text = f"{p.name} {p.category}".lower()
                if add_kw in p_text:
                    matched_prod = p
                    break
            if matched_prod:
                qty = 3 if "hinge" in add_kw else 1
                new_comp = {
                    "product_id": matched_prod.id,
                    "product_name": matched_prod.name,
                    "sku": matched_prod.sku,
                    "category": matched_prod.category,
                    "quantity": qty,
                    "unit_price": float(matched_prod.base_price or 0.0),
                    "action": "added"
                }
                proposed_components.append(new_comp)
                added_items.append(matched_prod.name)

    rationale_parts = []
    if added_items:
        rationale_parts.append(f"Added {len(added_items)} component(s) from catalog: {', '.join(added_items)}")
    elif add:
        rationale_parts.append(f"Requires additions for: {', '.join(add)}")
    if removed_items:
        rationale_parts.append(f"Removed non-compliant component(s): {', '.join(removed_items)}")
    elif remove:
        rationale_parts.append(f"Reviewed unneeded items: {', '.join(remove)}")
    if not added_items and not removed_items:
        rationale_parts.append("Minor adjustments only — set closely aligns with spec.")

    plan = {
        "add": add,
        "remove": remove,
        "added_products": added_items,
        "removed_products": removed_items,
        "rationale": ". ".join(rationale_parts)
    }
    return plan, proposed_components


def match_hardware_sets(db, project_type, specifications):
    all_hw = db.query(models.HardwareSet).all()
    if not all_hw:
        return {"exact_matches": [], "closest_match": None, "customisation_plan": None, "proposed_components": [], "all_scored": [], "message": "No hardware sets found in the database."}

    required_components = _resolve_required_components(project_type, specifications)
    scored = []
    for hw in all_hw:
        result = _score_hardware_set(hw, project_type, specifications, required_components)
        scored.append(result)
    scored.sort(key=lambda x: x["score"], reverse=True)

    exact_matches = [s for s in scored if s["is_exact_match"]]
    below_threshold = [s for s in scored if not s["is_exact_match"]]
    closest_match = below_threshold[0] if below_threshold and not exact_matches else None
    customisation_plan = None
    proposed_components = []

    if exact_matches:
        proposed_components = exact_matches[0].get("components") or []
    elif closest_match:
        customisation_plan, proposed_components = _build_customisation_plan(db, closest_match, required_components)

    return {
        "exact_matches": exact_matches,
        "closest_match": closest_match,
        "customisation_plan": customisation_plan,
        "proposed_components": proposed_components,
        "required_components": required_components,
        "all_scored": scored,
        "summary": (
            f"{len(exact_matches)} exact match(es) found for {project_type} project."
            if exact_matches else
            f"No exact match. Closest: '{closest_match['name']}' ({closest_match['match_pct']}% match). Customised hardware set generated."
            if closest_match else
            "No hardware sets available."
        ),
    }
