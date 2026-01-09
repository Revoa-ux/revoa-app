# Ad Manager Refresh - What Changed (User Guide)

## What You'll Notice

### 1. **Metrics Load Instantly** ⚡
- Your ad metrics now appear in **3-5 seconds** (previously 20+ seconds)
- You can start working with your data immediately
- No more waiting for AI analysis before seeing numbers

### 2. **AI Works in the Background** 🤖
- The "Infused with Revoa AI" badge transforms to blue "AI Analyzing..." when working
- Your metrics are fully interactive while AI works
- AI suggestions appear dynamically as they're generated
- Table remains responsive the entire time
- Badge automatically returns to normal when AI completes

### 3. **Better Status Indicators** 📊
- **Spinning refresh button** = Syncing data
- **Table skeleton loader** = Loading metrics
- **Red "Infused with Revoa AI" badge** = Normal state (AI ready)
- **Blue "AI Analyzing..." badge** = AI is working in background
- **Success toast** = Metrics loaded successfully
- **Green gradient rows** = AI found optimization opportunities

### 4. **Clearer Error Messages** ✅
If AI encounters an issue, you'll see specific messages:

- **"AI analysis is taking longer than expected"**
  - Normal for large ad accounts
  - Your metrics are still fully available
  - AI will retry automatically

- **"AI analysis rate limit reached"**
  - Too many API calls in short period
  - Wait a few minutes and try again
  - Your current data remains accessible

- **"Network error during AI analysis"**
  - Check your internet connection
  - Metrics are already loaded
  - Retry when connection is stable

- **"AI analysis encountered an issue"**
  - General AI error
  - Your metrics are not affected
  - Can continue working normally

### 5. **Smart Refresh Cooldown** ⏱️
- AI won't regenerate suggestions if you refreshed within last 5 minutes
- Prevents unnecessary API calls
- Saves costs and respects rate limits
- You'll see: "Revoa AI suggestions were recently updated. Next refresh available in X minutes."

---

## How to Use the New Refresh

### Standard Workflow

1. **Click "Refresh" button**
   - Button shows spinner
   - Wait 3-5 seconds

2. **Metrics appear**
   - Success toast shows: "Data refreshed successfully"
   - Table becomes interactive
   - Start analyzing your campaigns/ads/ad sets immediately

3. **AI badge transforms** (optional)
   - Badge changes from red "Infused with Revoa AI" to blue "AI Analyzing..."
   - Spinner icon appears on badge
   - Continue working - no need to wait

4. **AI completes** (15-60 seconds later)
   - Badge transforms back to red "Infused with Revoa AI"
   - Row gradients appear on entities with suggestions
   - Toast: "Revoa AI found X optimization opportunities!"

---

## When Things Go Wrong

### Scenario: "Metrics won't load"
**What you see:** Error toast, no data appears

**What to do:**
1. Check your internet connection
2. Verify ad platform is still connected (Settings page)
3. Click refresh again
4. If persists, contact support with error message

### Scenario: "AI suggestions not showing"
**What you see:** Metrics load, badge stays red (no transformation to blue)

**Possible reasons:**
- Cooldown period active (wait 5 minutes)
- No actionable insights found (AI will notify you)
- AI timed out (will retry on next refresh)
- Rate limit reached (wait a few minutes)

**What to do:**
- Check console for AI status messages
- Wait for cooldown period to expire
- Retry refresh after a few minutes
- Your metrics are still fully functional

### Scenario: "AI is stuck analyzing"
**What you see:** Blue "AI Analyzing..." badge for over 2 minutes

**What happens:**
- AI has automatic 2-minute timeout
- You'll see: "AI analysis is taking longer than expected"
- Badge transforms back to red "Infused with Revoa AI"
- Metrics remain fully functional
- AI will retry on next manual refresh

---

## Performance Tips

### Best Practices

1. **Don't spam refresh**
   - 5-minute cooldown prevents excessive AI calls
   - Data is cached for quick access
   - Only refresh when you need fresh platform data

2. **Let AI finish**
   - While metrics load instantly, AI needs time
   - Blue badge indicates AI is working
   - Don't refresh again until badge disappears

3. **Use cached data**
   - Initial page load uses cache (instant)
   - AI suggestions load in background
   - No need to refresh unless data is stale

4. **Monitor the timing**
   - Sync: ~3 seconds
   - Metrics: ~1 second
   - AI: 15-60 seconds (varies by account size)

---

## Visual Guide

### What Each Indicator Means

```
Normal State:
┌─────────────────────────────────────────┐
│ Cross-Platform Ad Manager               │
│ [Infused with Revoa AI] ← Red badge = Ready
│ • Meta Ads Connected - Updated 2m ago   │
└─────────────────────────────────────────┘

AI Analyzing:
┌─────────────────────────────────────────┐
│ Cross-Platform Ad Manager               │
│ [🔄 AI Analyzing...] ← Blue badge = Working
│ • Meta Ads Connected - Updated 2m ago   │
└─────────────────────────────────────────┘
         ↑
    Badge transforms color and text

[Refresh 🔄] ← Spinning = Syncing data

┌──────────────────────────────────────────┐
│ Campaigns (24) | Ad Sets (156) | Ads (892)│
├──────────────────────────────────────────┤
│ 🟢 Campaign Name 1  $1,234  2.3x  ACTIVE │ ← Green gradient = AI suggestion
│    Campaign Name 2  $567    1.8x  ACTIVE │
│    Campaign Name 3  $890    1.5x  PAUSED │
└──────────────────────────────────────────┘
```

---

## FAQ

**Q: Why do metrics load before AI suggestions?**
A: We split the refresh into two phases so you can start working immediately. AI analysis runs in the background without blocking you.

**Q: Can I use the table while AI is analyzing?**
A: Yes! The table is fully interactive. Click, sort, filter, drill down - everything works while AI runs in the background.

**Q: What if AI fails?**
A: Your metrics are never affected by AI failures. You'll see a specific error message, but all your data remains accessible.

**Q: How often should I refresh?**
A: Only when you need fresh data from platforms. The app uses smart caching, so data is available instantly on page load.

**Q: What does the 5-minute cooldown mean?**
A: AI won't regenerate suggestions if you refreshed recently. This prevents excessive API calls and respects rate limits. Your metrics still refresh normally.

**Q: Why does AI take so long?**
A: AI analyzes every campaign, ad set, and ad across multiple platforms using advanced algorithms. For large accounts with 100+ ads, this takes time. The good news: it doesn't block you anymore.

**Q: Can I skip AI analysis?**
A: Not currently, but it runs in the background so it doesn't slow you down. We may add a "Skip AI" option in the future.

---

## Keyboard Shortcuts

- **Refresh data:** Click refresh button (no shortcut yet)
- **View AI suggestion:** Click row with green gradient
- **Dismiss AI badge:** Badge auto-dismisses when AI completes

---

## Browser Console Tips

If you're debugging or want to see performance metrics:

1. Open browser console (F12 or Cmd+Option+I)
2. Look for these logs:
   ```
   [Refresh] Phase 1: Sync completed in 2847ms
   [Refresh] Phase 1: Data fetched in 1523ms
   [Refresh] Phase 1 complete: 4370ms total
   [Refresh] Phase 2: Starting background AI analysis...
   [Rex] AI analysis complete: 12 suggestions
   ```

3. If you see errors:
   ```
   [Rex] Error generating AI suggestions: [error details]
   ```
   Copy the error and report to support.

---

## What's Next?

Future improvements planned:
- Progressive AI loading (see suggestions as they generate)
- Manual AI retry button
- Smart caching for AI suggestions
- Performance telemetry dashboard

---

**Questions or Issues?**
- Check console for detailed logs
- Report errors with specific error messages
- Include timing information if metrics are slow
- Note which phase failed (Phase 1 = metrics, Phase 2 = AI)

**Last Updated:** January 9, 2026
