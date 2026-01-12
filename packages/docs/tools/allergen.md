# Allergen Tools

Tools for allergen detection, dietary compatibility, and finding safe alternatives.

## checkAllergens

Check product for specific allergens.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `allergens` | string[] | Yes | Allergens to check for |

### Supported Allergens

- `gluten`, `wheat`, `milk`, `eggs`, `fish`, `shellfish`
- `peanuts`, `tree_nuts`, `soy`, `sesame`, `celery`
- `mustard`, `lupin`, `molluscs`, `sulfites`

### Example

```json
{
  "barcode": "3017620422003",
  "allergens": ["milk", "peanuts", "gluten"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "safe": false,
    "contains": ["milk"],
    "mayContain": [],
    "warnings": [
      "Contains milk: skimmed milk powder"
    ]
  }
}
```

---

## findAllergenFree

Find products without specific allergens.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `excludeAllergens` | string[] | Yes | Allergens to exclude |
| `limit` | number | No | Max results |

### Example

```json
{
  "query": "chocolate spread",
  "excludeAllergens": ["milk", "tree_nuts"],
  "limit": 5
}
```

### Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "barcode": "5060156110013",
        "name": "Dairy-Free Chocolate Spread",
        "brand": "Moo Free",
        "verified": true
      }
    ],
    "total": 12
  }
}
```

---

## getAllergenInfo

Get detailed information about an allergen.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `allergen` | string | Yes | Allergen name |

### Response

```json
{
  "success": true,
  "data": {
    "name": "Tree Nuts",
    "description": "Allergic reactions to tree nuts can be severe and life-threatening",
    "commonSources": [
      "Almonds", "Cashews", "Walnuts", "Hazelnuts",
      "Pecans", "Pistachios", "Brazil nuts", "Macadamias"
    ],
    "alternativeNames": ["nuts", "nut pieces", "nut oil"],
    "crossReactivity": ["peanuts (30% cross-react)"],
    "hiddenSources": [
      "Pesto", "Marzipan", "Praline", "Nougat",
      "Some cereals", "Ice cream", "Baked goods"
    ]
  }
}
```

---

## getDietCompatibility

Check product compatibility with dietary restrictions.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `diets` | string[] | Yes | Diets to check |

### Supported Diets

- `vegan`, `vegetarian`, `pescatarian`
- `gluten-free`, `dairy-free`, `nut-free`
- `keto`, `low-carb`, `low-sodium`
- `halal`, `kosher`

### Example

```json
{
  "barcode": "3017620422003",
  "diets": ["vegan", "gluten-free", "keto"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "compatible": ["gluten-free"],
    "incompatible": [
      {
        "diet": "vegan",
        "reason": "Contains milk"
      },
      {
        "diet": "keto",
        "reason": "High carbohydrate content (57.5g per 100g)"
      }
    ]
  }
}
```

---

## analyzeIngredients

Parse and analyze ingredient list.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "ingredients": [
      { "name": "Sugar", "percent": 56.3, "isAllergen": false },
      { "name": "Palm oil", "percent": null, "isAllergen": false },
      { "name": "Hazelnuts", "percent": 13, "isAllergen": true, "allergen": "tree_nuts" },
      { "name": "Skimmed milk powder", "percent": 8.7, "isAllergen": true, "allergen": "milk" }
    ],
    "additives": [
      { "code": "E322", "name": "Lecithin", "type": "emulsifier" },
      { "code": "E234", "name": "Vanillin", "type": "flavoring" }
    ],
    "concerns": [
      "High sugar content",
      "Contains palm oil"
    ]
  }
}
```

---

## getAllergenAlternatives

Find allergen-free alternatives to a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Original product barcode |
| `avoidAllergens` | string[] | Yes | Allergens to avoid |

### Example

```json
{
  "barcode": "3017620422003",
  "avoidAllergens": ["milk", "tree_nuts"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "original": {
      "name": "Nutella",
      "allergens": ["milk", "tree_nuts"]
    },
    "alternatives": [
      {
        "barcode": "5060156110013",
        "name": "Dairy-Free Chocolate Spread",
        "brand": "Moo Free",
        "similarity": 0.85,
        "allergensFree": ["milk", "tree_nuts"]
      }
    ]
  }
}
```

---

## getCrossContamination

Check cross-contamination risks.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "traces": ["peanuts", "soy"],
    "sharedFacility": ["wheat", "eggs"],
    "riskLevel": "medium",
    "warnings": [
      "May contain traces of peanuts",
      "Manufactured in facility that processes wheat and eggs"
    ]
  }
}
```

---

## validateAllergenClaim

Validate "free-from" claims on products.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `claim` | string | Yes | Claim to validate |

### Example

```json
{
  "barcode": "1234567890123",
  "claim": "gluten-free"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "claim": "gluten-free",
    "valid": true,
    "confidence": 0.95,
    "evidence": {
      "ingredientsChecked": true,
      "certificationFound": true,
      "crossContaminationRisk": "low"
    },
    "warnings": []
  }
}
```
