# Phase 2 Design: Status-Context-Action Template

## Overview

Phase 2 normalizes all navigation modules using a consistent "Status → Context → Action" structure template with a unified token system for headers, toolbars, tables, and empty states.

## Status-Context-Action Pattern

Every module follows this three-part structure:

### 1. STATUS (Top Section)
Shows the current state at a glance with key metrics and health indicators.

**Components:**
- Module title with icon
- Status badge or metric cards
- Quick stats (count, total, health indicator)
- Last updated timestamp (when relevant)

**Example (Schedule):**
```
Schedule                                    [+ New Appointment]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Status Overview
• 12 Upcoming Appointments
• Next: Tomorrow at 2:00 PM
• $2,400 Potential Revenue This Week
```

### 2. CONTEXT (Middle Section)
Provides filtering, search, and view controls to help users find what they need.

**Components:**
- Search bar (when applicable)
- Filter pills/tabs
- Sort controls
- Bulk action toolbar (when items selected)
- View mode toggles (list/grid/calendar)

**Example (Journal):**
```
[🔍 Search signer...]  [All] [This Month] [This Year]  [Export] [+ New Entry]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. ACTION (Bottom Section)
Displays the data with clear actions available for each item.

**Components:**
- Data table or card list
- Action buttons per row/card
- Empty state (when no data)
- Pagination (when needed)
- Loading states

**Example (Credentials):**
```
┌─────────────────────────────────────────────────────┐
│ Notary Commission • Expires in 45 days    [WARNING] │
│ State: CA • #12345678                               │
│ [View Details] [Renew Now]                          │
└─────────────────────────────────────────────────────┘
```

## Token System

### Header Tokens

**Module Header:**
```jsx
<div className="flex flex-wrap items-center justify-between gap-3 mb-5">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
      <i className="fas fa-[icon] text-white"></i>
    </div>
    <h3 className="text-2xl font-bold theme-text">[Module Name]</h3>
  </div>
  <button className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
    <i className="fas fa-plus mr-2"></i>[Primary Action]
  </button>
</div>
```

**Status Cards (when applicable):**
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
  <div className="status-card theme-surface theme-border border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">[Metric Name]</p>
      <div className="w-8 h-8 rounded-lg bg-[color]-50 flex items-center justify-center">
        <i className="fas fa-[icon] text-[color]-600 text-sm"></i>
      </div>
    </div>
    <p className="text-2xl font-bold text-[color]-600">[Value]</p>
    <p className="text-xs theme-text-muted mt-1">[Context]</p>
  </div>
</div>
```

### Toolbar Tokens

**Filter Bar:**
```jsx
<div className="flex flex-wrap items-center gap-2 mb-4">
  {filters.map(filter => (
    <button
      key={filter}
      onClick={() => setActiveFilter(filter)}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
        activeFilter === filter 
          ? 'theme-pill' 
          : 'theme-border theme-text-muted hover:theme-text'
      }`}
    >
      {filter}
    </button>
  ))}
</div>
```

**Search + Actions Bar:**
```jsx
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="relative flex-1 min-w-[200px] max-w-md">
    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted text-xs"></i>
    <input 
      value={search} 
      onChange={(e) => setSearch(e.target.value)} 
      placeholder="[Search placeholder]" 
      className="w-full pl-8 pr-3 py-2 rounded-lg border theme-border theme-app-bg theme-text text-sm" 
    />
  </div>
  <div className="flex items-center gap-2">
    <button className="px-3 py-2 rounded-lg border theme-border theme-surface theme-text text-sm transition-all duration-200 hover:-translate-y-0.5">
      <i className="fas fa-[icon] mr-2"></i>[Action]
    </button>
  </div>
</div>
```

**Bulk Action Toolbar (appears when items selected):**
```jsx
{selectedItems.length > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <i className="fas fa-check-circle text-blue-600"></i>
      <span className="font-semibold text-blue-900">{selectedItems.length} selected</span>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={handleBulkAction} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
        <i className="fas fa-[icon] mr-1"></i>[Bulk Action]
      </button>
      <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 text-sm font-semibold">
        Clear
      </button>
    </div>
  </div>
)}
```

### Table Tokens

**Desktop Table:**
```jsx
<div className="hidden md:block theme-surface theme-border border rounded-2xl overflow-hidden">
  <div className="grid grid-cols-[auto_1fr_...] gap-4 px-4 py-3 text-[11px] uppercase font-bold theme-text-muted border-b theme-border tracking-wide">
    <div><input type="checkbox" onChange={toggleSelectAll} checked={allSelected} /></div>
    <div>[Column 1]</div>
    <div>[Column 2]</div>
    <div className="text-right">[Column N]</div>
  </div>
  {items.map(item => (
    <div key={item.id} className="grid grid-cols-[auto_1fr_...] gap-4 px-4 py-3 border-b theme-border hover:theme-surface-muted transition-all duration-200">
      <div><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleSelect(item.id)} /></div>
      <div className="font-semibold theme-text truncate">[Data 1]</div>
      <div className="theme-text-muted truncate">[Data 2]</div>
      <div className="text-right flex justify-end gap-2">
        <button className="w-8 h-8 rounded-lg border theme-border theme-text-muted hover:theme-text">
          <i className="fas fa-pen text-xs"></i>
        </button>
        <button className="w-8 h-8 rounded-lg border theme-border text-red-600 hover:bg-red-50">
          <i className="fas fa-trash text-xs"></i>
        </button>
      </div>
    </div>
  ))}
</div>
```

**Mobile Cards:**
```jsx
<div className="md:hidden space-y-3">
  {items.map(item => (
    <div key={item.id} className="theme-surface theme-border border rounded-xl p-4 hover:border-indigo-400 transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold theme-text truncate">[Primary Info]</p>
          <p className="text-sm theme-text-muted truncate">[Secondary Info]</p>
        </div>
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[color]-100 text-[color]-700">
          [Status]
        </span>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 rounded-lg border theme-border theme-text font-semibold text-sm">
          <i className="fas fa-pen mr-2"></i>Edit
        </button>
        <button className="px-3 py-2 rounded-lg border theme-border text-red-600 font-semibold text-sm">
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  ))}
</div>
```

### Empty State Token

```jsx
<div className="theme-surface theme-border border rounded-2xl p-10 text-center">
  <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
    <i className="fas fa-[icon] theme-text-muted text-2xl"></i>
  </div>
  <h4 className="theme-text text-lg font-semibold mb-2">[Empty State Title]</h4>
  <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">[Empty State Description]</p>
  <button onClick={handleAction} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
    <i className="fas fa-plus mr-2"></i>[Primary Action]
  </button>
</div>
```

## Module-Specific Implementations

### Schedule Module

**STATUS:**
- Upcoming count
- Next appointment time
- Week's potential revenue

**CONTEXT:**
- Filters: All, Upcoming, Completed, Paid
- Search by client name
- Calendar view toggle

**ACTION:**
- Appointment cards with date badge
- Quick actions: Mark paid, Edit, View details
- Empty state: "Schedule clear"

### Journal Module

**STATUS:**
- Total entries this month
- Total fees collected
- Compliance health indicator

**CONTEXT:**
- Search by signer name
- Filters: All, This Month, This Year
- Bulk selection toolbar

**ACTION:**
- Table view (desktop) / Card view (mobile)
- Actions: Edit, Delete, Export
- Empty state: "No notarial acts logged yet"

### Credentials Module

**STATUS:**
- Active credentials count
- Expiring soon count (≤60 days)
- Compliance status

**CONTEXT:**
- Filters: All, Active, Expiring Soon, Expired
- Sort by expiration date

**ACTION:**
- Credential cards with expiration badges
- Actions: View, Renew, Upload document
- Empty state: "No credentials added"

### Finances Module

**STATUS:**
- YTD revenue
- This month expenses
- Net profit

**CONTEXT:**
- Tabs: Expenses, Mileage, Reports
- Date range picker
- Category filters

**ACTION:**
- Transaction table with categories
- Actions: Edit, Delete, Export
- Empty state: "No financial records"

### Clients Module

**STATUS:**
- Total clients
- Active this month
- Average transaction value

**CONTEXT:**
- Search by name, email, phone
- Filters: All, Active, Inactive
- Sort by last contact

**ACTION:**
- Client cards with contact info
- Actions: View history, Edit, Contact
- Empty state: "No clients yet"

## Implementation Checklist

For each module:
- [ ] Add STATUS section with relevant metrics
- [ ] Implement CONTEXT controls (search, filters, bulk actions)
- [ ] Normalize ACTION section with token system
- [ ] Update empty states with consistent styling
- [ ] Add loading states
- [ ] Ensure mobile responsiveness
- [ ] Add hover effects and transitions
- [ ] Test theme switching
- [ ] Verify accessibility (keyboard navigation, screen readers)

## Color Consistency

Use Phase 1 locked semantic colors:
- **Emerald** (`emerald-600`): Success, healthy, positive
- **Blue** (`blue-600`): Informational, neutral
- **Amber** (`amber-600`): Warning, attention
- **Red** (`red-600`): Critical, urgent
- **Slate** (`slate-400`): Inactive, disabled

## Next Steps

1. Implement template for Schedule module
2. Apply to Journal module
3. Apply to Credentials module
4. Apply to Finances module
5. Apply to Clients module
6. Test consistency across all modules
7. Document any module-specific variations
