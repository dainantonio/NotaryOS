# Phase 3 Design: Retention Layer

## Overview

Phase 3 adds engagement and retention features to keep users coming back: weekly performance recaps, goal tracking with streaks, and configurable alerts for critical business events.

## 1. Weekly Performance Recap

### Concept
A summary card that appears on the dashboard every Monday (or first login of the week) showing the previous week's performance with insights and encouragement.

### Data Points
- **Appointments Completed**: Count and comparison to previous week
- **Revenue Earned**: Total fees collected with trend
- **Journal Entries**: Notarial acts logged
- **Compliance Status**: Any credentials that moved into warning zone
- **Top Achievement**: Highlight (e.g., "Best week this month!" or "3-week streak!")

### UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Your Week in Review                    Jan 6 - Jan 12    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🎯 8 Appointments Completed    (+2 from last week)          │
│  💰 $1,240 Revenue Earned       (+15% from last week)        │
│  📝 12 Journal Entries          (100% compliance)            │
│  ⚠️  1 Credential Expiring      (Renew by Feb 15)           │
│                                                               │
│  🏆 Achievement: Best revenue week this month!               │
│                                                               │
│  [View Detailed Report] [Dismiss]                            │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Storage:**
```javascript
localStorage.setItem('notary_weekly_recap_last_shown', timestamp);
localStorage.setItem('notary_weekly_stats_[week_id]', JSON.stringify({
  weekStart: '2026-01-06',
  weekEnd: '2026-01-12',
  appointmentsCompleted: 8,
  revenueEarned: 1240,
  journalEntries: 12,
  credentialsExpiring: 1,
  comparisonToPrevious: { appointments: +2, revenue: +15 }
}));
```

**Logic:**
- Calculate on dashboard load
- Show if: (1) Monday OR (2) first login this week
- Dismiss button stores timestamp
- Compare current week to previous week
- Identify top achievement automatically

**Achievements:**
- "Best revenue week this month"
- "Most appointments completed"
- "Perfect compliance streak"
- "3-week growth streak"
- "New personal record"

### Detailed Report View

Clicking "View Detailed Report" opens a modal with:
- Daily breakdown chart
- Revenue trend graph
- Top clients this week
- Comparison to monthly average
- Suggestions for improvement

## 2. Goal Tracking + Streaks

### Concept
Users can set monthly goals and track progress with visual indicators and streak counters to build momentum.

### Goal Types

1. **Revenue Goal**
   - Target: Monthly revenue amount
   - Progress: Current month revenue / target
   - Streak: Consecutive months hitting goal

2. **Appointment Goal**
   - Target: Number of appointments per month
   - Progress: Current count / target
   - Streak: Consecutive months hitting goal

3. **Compliance Goal**
   - Target: 100% journal entries logged
   - Progress: Appointments with journal entries / total appointments
   - Streak: Consecutive weeks at 100%

4. **Client Acquisition Goal**
   - Target: New clients per month
   - Progress: New clients this month / target
   - Streak: Consecutive months hitting goal

### UI Design

**Dashboard Goal Card:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Your Goals                                    January     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  💰 Monthly Revenue: $3,200 / $5,000 (64%)                   │
│  ████████████░░░░░░░░  🔥 3 month streak                     │
│                                                               │
│  📅 Appointments: 12 / 20 (60%)                              │
│  ████████████░░░░░░░░  🔥 2 month streak                     │
│                                                               │
│  ✅ Compliance: 100% (Perfect!)                              │
│  ████████████████████  🔥 8 week streak                      │
│                                                               │
│  [Adjust Goals] [View History]                               │
└─────────────────────────────────────────────────────────────┘
```

**Goal Settings Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│ Set Your Goals                                          [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Monthly Revenue Goal                                        │
│  [$5,000        ] per month                                  │
│  💡 Based on your history, $4,500 is achievable             │
│                                                               │
│  Monthly Appointment Goal                                    │
│  [20           ] appointments per month                      │
│  💡 You averaged 15 last quarter                            │
│                                                               │
│  ☑ Track compliance streak (100% journal entries)           │
│  ☑ Track client acquisition (new clients per month)         │
│                                                               │
│  [Cancel] [Save Goals]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Streak Mechanics

**Calculation:**
- Revenue/Appointment: Check at end of each month
- Compliance: Check at end of each week
- Client Acquisition: Check at end of each month

**Streak Breaks:**
- Missing goal resets streak to 0
- Grace period: 1 miss allowed every 6 months (optional)

**Streak Milestones:**
- 🔥 3 months: "Getting Consistent"
- 🔥 6 months: "Building Momentum"
- 🔥 12 months: "Year of Excellence"
- 🔥 24 months: "Legendary Streak"

**Visual Indicators:**
- Flame emoji (🔥) + number
- Progress bars with gradient fills
- Celebration animations when hitting goals
- Confetti effect on new streak milestones

### Implementation Details

**Storage:**
```javascript
localStorage.setItem('notary_goals', JSON.stringify({
  revenue: { target: 5000, current: 3200, streak: 3 },
  appointments: { target: 20, current: 12, streak: 2 },
  compliance: { enabled: true, streak: 8 },
  clientAcquisition: { target: 5, current: 3, streak: 1 }
}));

localStorage.setItem('notary_goal_history', JSON.stringify([
  { month: '2026-01', revenue: 5200, appointments: 22, hit: true },
  { month: '2025-12', revenue: 4800, appointments: 19, hit: true },
  // ...
]));
```

**Logic:**
- Calculate progress on dashboard load
- Update streak counters at month/week end
- Show celebration modal when goal hit
- Send encouragement when close to goal (90%+)
- Suggest goal adjustments based on performance

## 3. Configurable Alerts

### Concept
Proactive notifications for critical business events that require attention, fully customizable by the user.

### Alert Types

#### 1. Compliance Alerts
- **Credential Expiring Soon**
  - Trigger: X days before expiration
  - Default: 60, 45, 30, 14, 7 days
  - Customizable: User sets thresholds

- **Missing Journal Entry**
  - Trigger: Appointment completed without journal entry
  - Default: Same day at 8 PM
  - Customizable: Delay period (same day, next day, 3 days)

- **Incomplete Client Records**
  - Trigger: Appointment without phone/email
  - Default: Weekly digest
  - Customizable: Immediate, daily, weekly, off

#### 2. Financial Alerts
- **Unpaid Invoice**
  - Trigger: X days after appointment completion
  - Default: 7, 14, 30 days
  - Customizable: Follow-up schedule

- **Low Revenue Warning**
  - Trigger: Below X% of monthly goal at day Y
  - Default: Below 50% at day 20
  - Customizable: Threshold and day

- **Expense Threshold**
  - Trigger: Monthly expenses exceed X
  - Default: Off
  - Customizable: Dollar amount

#### 3. Schedule Alerts
- **Appointment Reminder**
  - Trigger: X hours before appointment
  - Default: 24 hours, 2 hours
  - Customizable: Multiple reminders

- **Schedule Gap**
  - Trigger: No appointments in next X days
  - Default: 7 days
  - Customizable: Day threshold

- **Double Booking Risk**
  - Trigger: Appointments within X minutes
  - Default: 30 minutes
  - Customizable: Buffer time

### UI Design

**Alert Center (Dashboard):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Alerts (3)                                    [Settings]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ⚠️  URGENT • Notary Commission expires in 14 days          │
│     Renew now to avoid service disruption                    │
│     [Renew Now] [Dismiss]                                    │
│                                                               │
│  💰 REMINDER • 2 unpaid invoices (7+ days old)              │
│     Follow up with clients for payment                       │
│     [View Invoices] [Dismiss]                                │
│                                                               │
│  📅 INFO • No appointments scheduled for next week           │
│     Consider marketing or outreach                           │
│     [Add Appointment] [Dismiss]                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Alert Settings Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│ Alert Settings                                          [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Compliance Alerts                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ☑ Credential expiring soon                                  │
│     Alert me at: [60▾] [45▾] [30▾] [14▾] [7▾] days before  │
│                                                               │
│  ☑ Missing journal entry                                     │
│     Alert me: [Same day at 8 PM ▾]                          │
│                                                               │
│  ☑ Incomplete client records                                 │
│     Alert me: [Weekly digest ▾]                             │
│                                                               │
│  Financial Alerts                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ☑ Unpaid invoice                                            │
│     Alert me at: [7▾] [14▾] [30▾] days after completion    │
│                                                               │
│  ☑ Low revenue warning                                       │
│     Alert when below [50%] of goal at day [20] of month     │
│                                                               │
│  ☐ Expense threshold exceeded                                │
│     Alert when monthly expenses exceed $[1000]               │
│                                                               │
│  Schedule Alerts                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ☑ Appointment reminders                                     │
│     Alert me: [24 hours ▾] and [2 hours ▾] before          │
│                                                               │
│  ☑ Schedule gap warning                                      │
│     Alert when no appointments in next [7▾] days            │
│                                                               │
│  ☑ Double booking risk                                       │
│     Alert when appointments within [30▾] minutes            │
│                                                               │
│  [Cancel] [Save Settings]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Alert Priority Levels

**URGENT** (Red)
- Credential expires ≤14 days
- Double booking detected
- Missing journal entry (legal requirement)

**REMINDER** (Amber)
- Credential expires 15-60 days
- Unpaid invoice 7+ days
- Low revenue warning

**INFO** (Blue)
- Schedule gap
- Incomplete records
- Expense threshold

### Implementation Details

**Storage:**
```javascript
localStorage.setItem('notary_alert_settings', JSON.stringify({
  compliance: {
    credentialExpiring: { enabled: true, thresholds: [60, 45, 30, 14, 7] },
    missingJournal: { enabled: true, timing: 'same_day_8pm' },
    incompleteRecords: { enabled: true, frequency: 'weekly' }
  },
  financial: {
    unpaidInvoice: { enabled: true, days: [7, 14, 30] },
    lowRevenue: { enabled: true, threshold: 50, day: 20 },
    expenseThreshold: { enabled: false, amount: 1000 }
  },
  schedule: {
    appointmentReminder: { enabled: true, times: ['24h', '2h'] },
    scheduleGap: { enabled: true, days: 7 },
    doubleBooking: { enabled: true, buffer: 30 }
  }
}));

localStorage.setItem('notary_active_alerts', JSON.stringify([
  {
    id: 'alert_1',
    type: 'credential_expiring',
    priority: 'urgent',
    title: 'Notary Commission expires in 14 days',
    message: 'Renew now to avoid service disruption',
    createdAt: timestamp,
    dismissed: false,
    actions: [
      { label: 'Renew Now', action: 'navigate_credentials' },
      { label: 'Dismiss', action: 'dismiss' }
    ]
  }
]));
```

**Alert Generation Logic:**
- Run on dashboard load
- Run on data changes (new appointment, status change)
- Check against user settings
- Deduplicate alerts (don't show same alert twice)
- Auto-dismiss when condition resolved

**Alert Display:**
- Show in dedicated Alert Center card on dashboard
- Badge count on navigation icon
- Optional browser notifications (with permission)
- Optional email digest (future enhancement)

### Snooze Feature
Users can snooze non-urgent alerts:
- Snooze for 1 day, 3 days, 1 week
- Alert reappears after snooze period
- Urgent alerts cannot be snoozed

## Integration with Dashboard

All Phase 3 features integrate into the existing dashboard:

1. **Weekly Recap**: Appears as prominent card at top (above Daily Brief)
2. **Goals Card**: Appears in right sidebar (below Action Items)
3. **Alert Center**: Appears below Daily Brief, above KPI cards

## Implementation Checklist

- [ ] Weekly recap calculation logic
- [ ] Weekly recap UI component
- [ ] Goal setting modal
- [ ] Goal progress tracking
- [ ] Streak calculation logic
- [ ] Goal achievement celebrations
- [ ] Alert generation engine
- [ ] Alert settings modal
- [ ] Alert display component
- [ ] Alert dismissal logic
- [ ] Snooze functionality
- [ ] Browser notification integration
- [ ] Data persistence and migration
- [ ] Performance optimization (caching)
- [ ] Mobile responsiveness

## Future Enhancements

- Email/SMS notifications for alerts
- Custom alert rules (advanced users)
- Team alerts (for agency plans)
- Historical trend analysis
- Predictive alerts (ML-based)
- Integration with calendar apps
- Voice alerts (mobile app)
