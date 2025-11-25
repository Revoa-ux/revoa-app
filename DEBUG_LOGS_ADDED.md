# ✅ Debug Logging Added

## What Was Added

### 1. adReportsService.ts (line 495-505)
```typescript
// DEBUG: Log first 3 creatives to see actual data
console.log('[DEBUG AdReportsService] First 3 creatives sample:', creatives.slice(0, 3).map(c => ({
  id: c.id,
  name: c.adName,
  metrics: {
    impressions: c.metrics.impressions,
    clicks: c.metrics.clicks,
    spend: c.metrics.spend,
    conversions: c.metrics.conversions
  }
})));
```

### 2. Audit.tsx (line 436-446)
```typescript
// DEBUG: Log what Audit receives and passes down
console.log('[DEBUG Audit] Fetched data:', {
  creativesCount: creativesData.length,
  campaignsCount: campaignsData.length,
  adSetsCount: adSetsData.length,
  sampleCreative: creativesData[0] ? {
    id: creativesData[0].id,
    name: creativesData[0].adName,
    metrics: creativesData[0].metrics
  } : null
});
```

### 3. CreativeAnalysisEnhanced.tsx (line 130-139)
```typescript
// DEBUG: Log what CreativeAnalysis receives
console.log('[DEBUG CreativeAnalysis] Received', creatives.length, 'creatives');
if (creatives.length > 0) {
  console.log('[DEBUG CreativeAnalysis] First 3 samples:', creatives.slice(0, 3).map(c => ({
    id: c.id,
    name: c.adName,
    metrics: c.metrics,
    hasMetrics: !!c.metrics
  })));
}
```

## How to Use

1. **Open your browser**
2. **Open DevTools** (F12 or right-click → Inspect)
3. **Go to Console tab**
4. **Navigate to Audit page → Ad Manager**
5. **Look for these logs:**

```
[AdReportsService] === FETCHING CREATIVE PERFORMANCE WITH ATTRIBUTION ===
[AdReportsService] ✓ Returned X ads
[DEBUG AdReportsService] First 3 creatives sample: [...]
[DEBUG Audit] Fetched data: { creativesCount: X, ... }
[DEBUG CreativeAnalysis] Received X creatives
[DEBUG CreativeAnalysis] First 3 samples: [...]
```

## What to Look For

### ✅ Good Case:
```javascript
[DEBUG AdReportsService] First 3 creatives sample: [
  {
    id: "120238074196640671",
    name: "2.1M",
    metrics: {
      impressions: 2,
      clicks: 0,
      spend: 0.07,
      conversions: 0
    }
  },
  // ... more ads
]
```

### ❌ Bad Case (Data Becomes Zeros):
```javascript
[DEBUG AdReportsService] First 3 creatives sample: [
  {
    id: "120238074196640671",
    name: "2.1M",
    metrics: {
      impressions: 0,  // ← Should be 2!
      clicks: 0,
      spend: 0,        // ← Should be 0.07!
      conversions: 0
    }
  }
]
```

## Diagnosis

If you see:
1. **AdReportsService has data** but **Audit shows zeros** → Props not passing correctly
2. **AdReportsService has zeros** → Aggregation logic broken (line 405-407)
3. **All logs show zeros** → No metrics in database for selected date range

## Next Steps

**After checking console:**
- Share the console output
- We'll know exactly where data becomes zeros
- Can then fix the specific location

**Status:** ✅ Build successful, debug logs deployed
