# EVT Feuerwehr-Einsatzverwaltungstool - Design Guidelines

## Design Approach

**System-Based Approach**: Professional dashboard application drawing from Carbon Design System and Material Design principles, adapted for emergency services context. This is a utility-focused application where data clarity, efficient workflows, and professional presentation are paramount.

## Core Design Principles

1. **Information Density with Clarity**: Present complex operational data in digestible, scannable formats
2. **Role-Appropriate Access**: Clear visual distinction between admin and member capabilities
3. **Operational Confidence**: Design inspires trust and reliability for critical fire department operations
4. **Rapid Data Processing**: Users should quickly assess mission readiness and personnel status

## Typography System

**Font Stack**: Use Inter or IBM Plex Sans for professional, highly legible interface text
- **Headings**: 
  - H1: 2rem (32px), font-weight: 700
  - H2: 1.5rem (24px), font-weight: 700
  - H3: 1.25rem (20px), font-weight: 600
  - H4: 1.125rem (18px), font-weight: 600
- **Body Text**: 0.938rem (15px), font-weight: 400, line-height: 1.6
- **Small Text/Labels**: 0.875rem (14px), font-weight: 500
- **Table Text**: 0.875rem (14px), font-weight: 400

## Layout System

**Spacing Units**: Tailwind spacing with primary units of **4, 8, 12, 16, 20, 24** (p-4, gap-8, mb-12, etc.)

**Container Structure**:
- Max width: `max-w-7xl` for main application container
- Padding: `px-4 md:px-6 lg:px-8`
- Section spacing: `py-6` to `py-8` between major sections

**Grid Layouts**:
- Dashboard cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Two-column forms/data: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Responsive breakpoints: Default mobile-first, md: 768px, lg: 1024px

## Component Library

### Navigation & Header
**Top Navigation Bar**:
- Sticky header: `sticky top-0 z-50`
- Height: `h-16`
- Content alignment: `flex items-center justify-between px-6`
- Logo/Brand: Emoji 🚒 + "EVT" text, font-weight: 700, tracking-tight
- Navigation links: Horizontal flex layout with emoji icons prefix
- User indicator: Display logged-in user name and role badge on right
- Mobile: Hamburger menu that opens full-screen overlay navigation

### Cards & Panels
**Standard Card**:
- Border radius: `rounded-xl` (12px)
- Padding: `p-6`
- Shadow: `shadow-lg`
- Border: 1px solid (panel border treatment)
- Each card has clear header with icon + title

**Stat Cards** (Dashboard):
- Large number display: 2.5rem, font-weight: 700
- Label below: small text, muted
- Icon in top-right corner: 2.5rem size
- Hover state: subtle scale transform `hover:scale-[1.02]` transition

### Data Tables
**Table Structure**:
- Full width within container
- Header row: font-weight: 600, border-bottom: 2px
- Data rows: border-bottom: 1px, padding: `py-4 px-6`
- Zebra striping: subtle background alternation on rows
- Actions column: Right-aligned, min-width for buttons
- Mobile: Transform to stacked card layout below md breakpoint

**Table Features**:
- Sortable headers (arrow indicators)
- Search/filter input above table
- Pagination for lists > 20 items
- Empty state message when no data

### Forms & Inputs
**Input Fields**:
- Height: `h-11` for text inputs
- Padding: `px-4`
- Border radius: `rounded-lg`
- Border: 1px solid with focus ring treatment
- Labels: Block display, `mb-2`, font-weight: 500

**Form Layout**:
- Grid-based: `grid grid-cols-1 md:grid-cols-2 gap-6` for multi-field forms
- Full-width for text areas: `grid-cols-1`
- Submit buttons: Right-aligned or full-width on mobile

**Checkboxes** (Qualifications):
- Grid layout: `grid grid-cols-2 md:grid-cols-3 gap-4`
- Custom checkbox styling with label inline
- Clear hover/focus states

### Buttons & CTAs
**Primary Button**:
- Height: `h-11`
- Padding: `px-6`
- Border radius: `rounded-lg`
- Font weight: 600
- Transition: all properties 150ms ease

**Secondary Button**:
- Same dimensions as primary
- Outlined or muted background treatment

**Danger Button** (Delete actions):
- Red treatment for destructive actions
- Confirmation dialog required

**Button Sizes**:
- Default: h-11, px-6, text-base
- Small: h-9, px-4, text-sm (table actions)

### Badges & Tags
**Qualification Badges**:
- Height: `h-7`
- Padding: `px-3`
- Border radius: `rounded-full`
- Font size: 0.813rem
- Display inline-flex with gap-2 between multiple badges
- Border: 1px solid (subtle border treatment)

**Status Indicators**:
- Dot + text: `flex items-center gap-2`
- Dot: `w-2 h-2 rounded-full`
- Success/Warning/Error states with appropriate visual treatment

### Flash Messages
**Alert Banners**:
- Positioned at top of main content area
- Full width with max-width container
- Height: min-h-12
- Padding: `px-4 py-3`
- Border radius: `rounded-lg`
- Icon + message + dismiss button
- Success (✅), Warning (⚠️), Error (❌) variants
- Auto-dismiss after 5 seconds with fade-out animation

### Modal Dialogs
**Confirmation Dialogs**:
- Overlay: backdrop blur effect
- Dialog: `max-w-md`, centered, `rounded-xl`, `p-6`
- Header + message + action buttons (Cancel + Confirm)
- Focus trap for keyboard navigation
- ESC key to close

### Dashboard Specific Components
**Besetzungscheck Display**:
- Three-column grid showing: Available / Required / Status
- Each column as card with large numbers
- Visual check (✅) or warning (❌) indicators
- Progress bars for qualification counts vs requirements

**Vehicle List Cards**:
- Compact card showing: Vehicle icon, Name, Funkrufname, Besatzung count
- Grid layout: 1-2 columns responsive
- Action buttons in card footer

**Kameraden Table**:
- Name column: Bold, 16px
- Qualifications column: Badges wrapped in flex container
- Mobile: Stack name above qualifications
- Expandable rows for additional details on mobile

## Spacing & Rhythm

**Vertical Spacing**:
- Between sections: `mb-8` to `mb-12`
- Between card groups: `gap-6`
- Within cards: `space-y-4` for stacked content
- Form field groups: `mb-6`

**Horizontal Spacing**:
- Navigation items: `gap-6` on desktop, `gap-4` on mobile
- Button groups: `gap-3`
- Inline elements: `gap-2`

## Responsive Behavior

**Breakpoint Strategy**:
- Mobile (< 768px): Single column, full-width elements, stacked navigation
- Tablet (768px - 1024px): Two-column grids, horizontal navigation
- Desktop (> 1024px): Three-column grids, full feature set

**Mobile Optimizations**:
- Tables convert to stacked cards
- Multi-column forms stack to single column
- Navigation collapses to hamburger menu
- Touch-friendly targets: minimum 44x44px

## Accessibility

- WCAG 2.1 AA compliance throughout
- Focus indicators: 2px solid ring with offset
- Form labels explicitly associated with inputs (htmlFor)
- ARIA labels for icon-only buttons
- Skip navigation link
- Keyboard navigation for all interactive elements
- Screen reader announcements for flash messages

## Icons

**Library**: Heroicons (outline for navigation, solid for status indicators)
- Navigation: 1.5rem (24px) size
- Cards/Buttons: 1.25rem (20px) size  
- Inline icons: 1rem (16px) size
- Combine with emoji for fire department context (🚒 🚛 👥 ⚙️)

## Images

This application does not require hero images or marketing imagery. Visual content is limited to:
- Logo/branding: Small fire truck emoji + EVT text
- Optional: Placeholder for fire department badge/emblem (100x100px) in footer or login page
- All other visuals are icon-based or data visualizations

## Animation & Interaction

**Minimal Animation Strategy**:
- Button hover: subtle background shift, 150ms ease
- Card hover: `scale-[1.02]` transform, 200ms ease
- Page transitions: None (instant navigation for operational efficiency)
- Flash message: Slide-in from top (200ms), fade-out on dismiss (300ms)
- Modal: Fade-in overlay + scale-in dialog (200ms)
- No scroll-triggered animations
- No loading spinners except for data-heavy operations (>1s)

## Unique Design Elements

**Emoji Integration**: Maintain playful but professional emoji usage:
- Navigation icons as prefixes to text labels
- Section headers with relevant emoji (📊 🚒 👥 🚛 ⚙️)
- Flash messages with status emoji
- Consistent 1:1 ratio: one emoji per navigation item

**Dark Professional Aesthetic**: 
- Maintain sophisticated dark theme appropriate for emergency services
- High contrast for readability in various lighting conditions
- Professional typography and spacing
- Clean, uncluttered interfaces for rapid information processing

**Data-First Design**: 
- Tables and data displays are primary focus
- Forms are secondary to data viewing
- Clear visual hierarchy: Numbers/stats → Qualifications → Details
- Scannable layouts for quick operational decisions