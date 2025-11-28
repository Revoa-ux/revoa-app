# Quote System Redesign: Pack-Based Variant Structure

## ✅ COMPLETED - Both Modals Redesigned

Both `EditQuoteModal` and `ProcessQuoteModal` now use the same structure:
- **Wider layout** (max-w-5xl for better horizontal space)
- **Rose/Red branded accent** colors throughout
- **Identical PackSizeEditor** component
- **Same UX** between creating and editing quotes

## Problem

The previous quote system had a **fundamental logic flaw**:

```
❌ OLD STRUCTURE (Broken):
Pricing Option 1 (quantity: 100)
  ├─ SKU: SUN-100-BLK
  ├─ Variants: Color (White, Yellow)  ← Doesn't make sense!
  ├─ Cost per Item: $15
  └─ Shipping: $5

You can't have "100 units of White" when the product also comes in Yellow.
The variants and quantity were in the wrong hierarchy.
```

## Solution

Redesigned to match **Shopify's product model** with proper pack-based structure:

```
✅ NEW STRUCTURE (Correct):
Product: Sunglasses

Pack Option 1: Single Unit (packSize: 1)
  ├─ SKU Prefix: SUN-SINGLE
  ├─ Final Variants:
  │   ├─ White → SUN-SINGLE-WHT ($15, ship: $5)
  │   ├─ Yellow → SUN-SINGLE-YEL ($15, ship: $5)
  │   └─ Black → SUN-SINGLE-BLK ($16, ship: $5)

Pack Option 2: 5-Pack (packSize: 5)
  ├─ SKU Prefix: SUN-5PACK
  ├─ Final Variants:
  │   ├─ White → SUN-5PACK-WHT ($60, ship: $8)
  │   ├─ Yellow → SUN-5PACK-YEL ($60, ship: $8)
  │   └─ Black → SUN-5PACK-BLK ($65, ship: $8)
```

## Hierarchy

```
1. Product (e.g., Sunglasses)
   └─ 2. Pack Size (Single, 2-pack, 5-pack) ← "Pricing Options"
      └─ 3. Color/Size Variants (White, Yellow, Black)
         └─ 4. Final SKU = Base + Pack + Variant
```

## Technical Changes

### 1. Updated Types (`src/types/quotes.ts`)

```typescript
// NEW: Represents a single sellable SKU
interface FinalVariant {
  sku: string;                    // SUN-5PACK-WHT
  attributes: ProductAttribute[]; // [{name: "Color", value: "White"}]
  costPerItem: number;            // $60
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

// NEW: Represents a pack size option
interface QuoteVariant {
  packSize: number;               // 1, 5, 10, etc.
  skuPrefix: string;              // SUN-SINGLE, SUN-5PACK
  finalVariants: FinalVariant[];  // All color/size combos for this pack
}
```

### 2. New Component (`src/components/quotes/PackSizeEditor.tsx`)

Handles:
- Pack size configuration (1, 2, 5, 10 units)
- SKU prefix per pack
- Final variants within each pack
- Per-variant pricing and shipping
- Country-specific shipping rates

### 3. Redesigned Modal (`src/components/admin/EditQuoteModal.tsx`)

Features:
- Multiple pack options support
- Legacy data migration
- Clear hierarchy visualization
- Validation per pack and per variant

## Migration Strategy

The system automatically migrates old data:

```typescript
// Old format → New format
{
  quantity: 100,
  sku: "SUN-100",
  attributes: [{name: "Color", value: "White"}],
  costPerItem: 15,
  shippingCosts: { _default: 5 }
}

// Becomes:
{
  packSize: 100,
  skuPrefix: "SUN-100",
  finalVariants: [{
    sku: "SUN-100",
    attributes: [{name: "Color", value: "White"}],
    costPerItem: 15,
    shippingCosts: { _default: 5 }
  }]
}
```

## Benefits

1. **Logical Hierarchy**: Matches how merchants actually sell products
2. **Shopify Compatible**: Aligns with Shopify's variant system
3. **Flexible Pricing**: Different prices per color/size within each pack
4. **Clear Structure**: No more confusion about what "Pricing Option 1" means
5. **Scalable**: Easy to add multi-attribute variants (Color + Size)

## UI Flow

### Admin Creating Quote

```
1. Click "Process Quote"
2. Add Pack Option 1 (e.g., Single Unit)
   - Set pack size: 1
   - Set SKU prefix: SUN-SINGLE
   - Add variants:
     • Color: White → SUN-SINGLE-WHT ($15, ship: $5)
     • Color: Black → SUN-SINGLE-BLK ($16, ship: $5)
3. Add Pack Option 2 (e.g., 5-Pack)
   - Set pack size: 5
   - Set SKU prefix: SUN-5PACK
   - Add variants:
     • Color: White → SUN-5PACK-WHT ($60, ship: $8)
     • Color: Black → SUN-5PACK-BLK ($65, ship: $8)
4. Submit quote
```

### User Viewing Quote

User sees clear options:
- **Single Unit**: White ($20 total) or Black ($21 total)
- **5-Pack**: White ($68 total) or Black ($73 total)

## Database Schema

No migration needed! The `variants` column in `product_quotes` table is already JSONB, so it handles both old and new formats transparently.

## Backward Compatibility

- Old quotes automatically migrate to new structure
- No data loss
- Seamless transition for existing users

## Next Steps

To apply this to other modals:
1. Update "Process Quote" modal (admin creates new quotes)
2. Update user-facing quote review UI
3. Add multi-attribute support (Color + Size combinations)
