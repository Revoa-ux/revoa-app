# Attribution System Analysis: Revoa vs. Hyros & TripleWhale

**Date:** December 5, 2025
**Status:** Gap Analysis & Recommendations

---

## Executive Summary

You're right on both counts:
1. **Pixel installation SHOULD be on Attribution page** - Makes way more sense contextually
2. **We're missing critical features** to truly compete with Hyros/TripleWhale

---

## What We Currently Have ✅

### 1. Client-Side Tracking (pixel.js)
- ✅ UTM parameter capture (source, medium, campaign, term, content)
- ✅ Click ID capture (fbclid, gclid, ttclid, msclkid)
- ✅ Session tracking with session IDs
- ✅ 30-day first-party cookie persistence
- ✅ Page view tracking
- ✅ Landing page & referrer capture
- ✅ Shopify checkout purchase tracking
- ✅ Basic browser data (screen size, user agent)

### 2. Server-Side Event Storage
- ✅ Edge function endpoint (`pixel-event`)
- ✅ Stores all events in `pixel_events` table
- ✅ Associates purchases with UTM data
- ✅ Real-time event processing

### 3. Facebook CAPI Integration
- ✅ Manual CAPI sending (`send-capi-events`)
- ✅ Email hashing (SHA-256)
- ✅ fbclid deduplication parameter
- ✅ Purchase event formatting
- ✅ Server-side conversion tracking

### 4. Attribution Matching
- ✅ Webhook-based order capture (`shopify-order-webhook`)
- ✅ UTM-to-ad matching via utm_term
- ✅ Ad name fuzzy matching
- ✅ Confidence scoring (1.0, 0.95, 0.8)
- ✅ Conversion recording in `ad_conversions` table
- ✅ Attribution rate calculation
- ✅ COGS deduction on order

---

## Critical Gaps vs. Hyros/TripleWhale ❌

### 1. **Automatic Real-Time CAPI** ⚠️ HIGH PRIORITY
**Status:** MISSING
**What we have:** Manual CAPI sending only
**What we need:**
- Automatic CAPI on every purchase (webhook trigger)
- Real-time event enrichment
- Automatic pixel-to-server deduplication using `event_id`
- Facebook, Google, TikTok CAPI support

### 2. **Enhanced Browser Fingerprinting** ⚠️ HIGH PRIORITY
**Status:** PARTIAL
**What we have:** Basic user agent, screen size
**What we need:**
```javascript
// Missing from pixel:
- IP address (server-side capture)
- Full device fingerprint
- Browser fingerprint
- Timezone
- Language
- More detailed device info
```

### 3. **Advanced PII Hashing** ⚠️ MEDIUM PRIORITY
**Status:** PARTIAL
**What we have:** Email hashing only
**What we need:**
- Phone number hashing
- First name hashing
- Last name hashing
- City hashing
- State hashing
- ZIP code hashing
- Country code
- All formatted per platform requirements

### 4. **Multi-Touch Attribution Models** ⚠️ HIGH PRIORITY
**Status:** MISSING
**What we have:** Last-click only
**What we need:**
- First-touch attribution
- Last-touch attribution
- Linear attribution
- Time-decay attribution
- Data-driven attribution
- User-configurable attribution windows

### 5. **Event Deduplication System** ⚠️ HIGH PRIORITY
**Status:** MISSING
**Current issue:** Same purchase could be sent twice (browser + server)
**What we need:**
```javascript
// In pixel:
const event_id = `${order_id}_${timestamp}_${session_id}`;

// Send same event_id to both:
// 1. Browser pixel
// 2. Server CAPI
// Platform deduplicates automatically
```

### 6. **Enhanced Match Quality Data** ⚠️ MEDIUM PRIORITY
**Status:** MISSING
**What platforms want for better matching:**
- External ID (customer ID)
- Full address data
- Phone number
- Date of birth
- Gender
- Lead ID
- All cart/product data

### 7. **Cross-Device Tracking** ⚠️ LOW PRIORITY
**Status:** MISSING
**What we need:**
- Device graph
- Identity resolution
- Cross-device session stitching
- User ID persistence

### 8. **Advanced Attribution Windows** ⚠️ MEDIUM PRIORITY
**Status:** MISSING
**What Hyros/TW have:**
- Configurable click windows (1d, 7d, 28d)
- View-through attribution
- Post-purchase attribution
- Return customer attribution
- LTV tracking per channel

### 9. **Real-Time Dashboard** ⚠️ MEDIUM PRIORITY
**Status:** BASIC
**What we have:** Static metrics
**What we need:**
- Live conversion feed
- Real-time event stream
- WebSocket updates
- Conversion notifications

### 10. **Incrementality Testing** ⚠️ LOW PRIORITY
**Status:** MISSING
**What we need:**
- Geo holdout testing
- PSA (Public Service Announcement) tests
- Conversion lift measurement
- True incremental ROAS

---

## Architecture Issues to Fix

### Issue 1: No Automatic CAPI on Purchase
**Current Flow:**
```
Order Created → Webhook → Store in DB → Manual CAPI Send
```

**Should Be:**
```
Order Created → Webhook → Store in DB → Auto CAPI Send → Log Event
```

**Fix:** Add automatic CAPI trigger in `shopify-order-webhook` after order storage

### Issue 2: Missing Event Deduplication
**Current:** No event_id system
**Risk:** Double-counting conversions
**Fix:** Implement universal event_id across pixel + server

### Issue 3: Incomplete User Data Collection
**Current:** Only capturing email
**Fix:** Enhance pixel + webhook to capture:
- Phone
- Name
- Address
- All Shopify customer fields

### Issue 4: No IP Address Capture
**Current:** Not capturing visitor IP
**Fix:** Server-side IP extraction in `pixel-event` function

---

## Recommended Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. **Move pixel installation to Attribution page** ✅ Easy win
2. **Automatic CAPI on purchase**
   - Modify `shopify-order-webhook` to auto-trigger CAPI
   - Add Facebook/Google/TikTok CAPI functions
3. **Event deduplication system**
   - Add `event_id` to pixel
   - Use same `event_id` in server events
4. **IP address capture**
   - Extract real IP in `pixel-event`
   - Handle proxy headers (X-Forwarded-For, etc.)

### Phase 2: Enhanced Matching (Week 2)
1. **Enhanced PII capture & hashing**
   - Phone, name, address from Shopify
   - Proper SHA-256 hashing
   - Format per platform specs
2. **Browser fingerprinting**
   - Add device fingerprint library
   - Capture timezone, language, plugins
3. **Better UTM preservation**
   - Extend cookie to 60 days
   - Store full journey (all pages)

### Phase 3: Advanced Features (Week 3-4)
1. **Multi-touch attribution models**
   - Build attribution engine
   - Configurable windows
   - Multiple models side-by-side
2. **Real-time dashboard**
   - Live conversion feed
   - WebSocket integration
   - Push notifications
3. **Cross-platform CAPI**
   - Google Ads CAPI
   - TikTok Events API
   - Pinterest Conversions API

---

## Pixel Installation Location Change

### Current Location: Settings Page
**Problem:**
- Settings is for general configuration
- Users don't associate Settings with attribution
- Buried in long settings page
- Doesn't explain WHY it's important

### Recommended Location: Attribution Page
**Benefits:**
- Contextually relevant (page is ABOUT attribution)
- Already explains how attribution works
- Already has warning for low attribution rate
- Natural place to install tracking tools
- Users come here to understand tracking

**Implementation:**
- Move `<PixelInstallation>` component from Settings to Attribution
- Add as prominent section below metrics cards
- Update warning message to point to same page
- Add "Setup Pixel" CTA button in warning banner

---

## Database Schema Additions Needed

```sql
-- Enhanced pixel events with fingerprinting
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS browser_fingerprint text;
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS event_id text UNIQUE;

-- Enhanced order data for better matching
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_first_name text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_last_name text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_city text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_state text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_zip text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS customer_country text;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS capi_sent_at timestamptz;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS capi_event_id text;

-- Multi-touch attribution support
CREATE TABLE IF NOT EXISTS customer_journey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  session_id text NOT NULL,
  touchpoint_order int NOT NULL,
  touchpoint_type text NOT NULL, -- 'ad_click', 'organic', 'direct', 'referral'
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  ad_id uuid REFERENCES ads(id),
  landing_page text,
  touched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

---

## Next Steps

1. **IMMEDIATE:** Move pixel installation to Attribution page
2. **THIS WEEK:** Implement automatic CAPI on purchase
3. **NEXT WEEK:** Add event deduplication and enhanced matching
4. **MONTH 1:** Multi-touch attribution models
5. **ONGOING:** Monitor attribution rate improvements

---

## Success Metrics

**Current State:**
- Attribution rate varies by user
- Manual CAPI sending
- Basic tracking only

**Target State (30 days):**
- 70%+ attribution rate
- Automatic CAPI on all platforms
- Enhanced match quality (MQ score 6.5+)
- Multi-touch attribution available
- Real-time event processing

---

## Competitive Feature Parity Checklist

### Hyros Features
- [ ] Automatic CAPI
- [ ] Multi-touch attribution
- [ ] Cross-device tracking
- [ ] Attribution window controls
- [ ] Email/SMS attribution
- [ ] Call tracking
- [ ] CRM integration

### TripleWhale Features
- [ ] Real-time dashboards
- [ ] Pixel health monitoring
- [ ] Creative analytics
- [ ] LTV tracking
- [ ] Cohort analysis
- [ ] Profit tracking (✅ WE HAVE THIS!)
- [ ] Multi-store support

---

## Conclusion

**You're absolutely right** - we need to:

1. **Move pixel to Attribution page** - Makes perfect sense
2. **Implement automatic CAPI** - Critical for competing
3. **Add event deduplication** - Prevent double-counting
4. **Enhance data collection** - More PII for better matching
5. **Build multi-touch attribution** - Enterprise feature

We have a solid foundation but need these enhancements to truly compete with Hyros and TripleWhale at the enterprise level.

**Recommended Action:** Start with Phase 1 this week - quick wins that dramatically improve attribution accuracy.
