# Phase 1 Dashboard Implementation

## Overview
Implementing dashboard-only features for Sprint 1:
1. Lock KPI internal alignment and semantic color rules
2. Prioritize action queue ordering
3. Add daily brief summary card

## Current State Analysis

### Dashboard Component Location
- File: `app.js`
- Lines: 2756-3001
- Current KPI Cards:
  - Revenue (YTD) - line 2880-2884
  - Upcoming Signings - line 2885-2889
  - Compliance Status - line 2890-2898

### Current Action Items
- Lines: 2811-2830
- Current priority logic exists but needs enhancement
- Two items: credentials and finances

## Implementation Details

### 1. KPI Semantic Color Rules (LOCKED)

**Color Palette:**
- Success/Positive: `emerald-600` (green)
- Warning/Attention: `amber-600` (yellow/orange)
- Critical/Danger: `red-600` (red)
- Neutral/Info: `blue-600` (blue)
- Muted/Secondary: `slate-600` (gray)

**KPI Card Styling Standards:**
- All cards use consistent border radius: `rounded-xl`
- All cards use consistent padding: `p-5`
- All cards use consistent shadow: `shadow-sm hover:shadow-md`
- All cards use consistent transition: `transition-all duration-200`
- All cards use hover effect: `hover:-translate-y-0.5`

**Revenue Card:**
- Primary color: `emerald-600` (positive growth)
- Trend indicator: Always green with up arrow
- Background: `theme-surface`

**Upcoming Signings Card:**
- Primary color: `blue-600` (informational)
- Count display: Bold, large font
- Background: `theme-surface`

**Compliance Status Card:**
- Dynamic color based on state:
  - Clear: `emerald-600`
  - Warning (31-60 days): `amber-600`
  - Critical (≤30 days): `red-600`
- Interactive: Clickable to view credentials

### 2. Action Queue Priority System

**Priority Levels (0-100):**
- 100: Critical - Immediate action required (≤30 days to expiry)
- 90: High - Urgent financial matters (unpaid invoices)
- 70: Medium-High - Warning state (31-60 days to expiry)
- 30: Low - No immediate action needed (finances healthy)
- 20: Very Low - All systems nominal (credentials healthy)

**Sorting:**
- Descending by priority score
- Higher priority items appear first

**Current Implementation:**
- Credentials: 100 (critical), 70 (warning), or 20 (healthy)
- Finances: 90 (unpaid invoices) or 30 (all paid)

**Enhancement:**
- Add more action items (appointments needing follow-up, missing client info, etc.)
- Add visual priority indicators (color-coded icons)

### 3. Daily Brief Summary Card

**New Component: DailyBriefCard**

**Location:** Insert after greeting section, before quick actions (around line 2863)

**Content:**
- Jobs Today: Count of appointments scheduled for today
- Potential Revenue: Sum of fees from today's appointments
- Open Risks: Count of urgent items (expiring credentials + unpaid invoices)
- Quick Stats: Time until next appointment

**Design:**
- Prominent card with gradient background
- Icon-based metrics
- Clickable sections that navigate to relevant views
- Responsive grid layout

**Data Source:**
- Reuse existing `dailyBrief` object (lines 2805-2809)
- Enhance with additional metrics

## Files to Modify
1. `app.js` - Dashboard component (lines 2756-3001)

## Testing Checklist
- [ ] All KPI cards display with correct semantic colors
- [ ] Action items sort correctly by priority
- [ ] Daily brief card displays accurate metrics
- [ ] All interactive elements navigate correctly
- [ ] Responsive design works on mobile and desktop
- [ ] Theme switching works correctly
- [ ] No console errors
