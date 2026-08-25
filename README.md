# Agri Candle Tracker

Build a complete, production-ready, offline-first, mobile-first web app called "AgriCandle".

AgriCandle is a commodity price tracking and trading decision app for agricultural traders. It is used to track daily prices of goods such as beans, pulses, sesame, maize, groundnut, lentils, and other agricultural commodities.

This app must be fully offline. It must not require internet, login, server, database backend, external API, live market data, or payment. All user data must be stored locally on the device.

The app should feel like an iOS app and be installable as a PWA on iPhone using "Add to Home Screen".

NON-NEGOTIABLE REQUIREMENTS

1. Fully offline:

   - No backend server.

   - No Supabase.

   - No Firebase.

   - No PostgreSQL.

   - No authentication.

   - No external API calls.

   - No live price feeds.

   - No analytics.

   - No remote fonts or remote images.

   - The app must work after installation without internet.

2. Data persistence:

   - Store all data locally using IndexedDB if possible.

   - If IndexedDB is too complex, use localStorage with structured JSON.

   - All create/edit/delete actions must persist immediately.

   - Refreshing the app must not lose data.

   - Use a local database name like "agri-candle-db".

   - Use crypto.randomUUID() for IDs.

3. Mobile-first UI:

   - Design for phone screens first.

   - Large tap targets.

   - Simple forms.

   - Bottom navigation bar.

   - Clean agriculture/trading style.

   - Green as primary color.

   - Easy to read tables.

   - Responsive on desktop too.

4. Use this stack if available:

   - React

   - TypeScript

   - Vite

   - Tailwind CSS

   - shadcn/ui components if available

   - React Router using HashRouter, not BrowserRouter

   - lucide-react icons if available

   - Local storage or IndexedDB for data

5. Do not use paid chart libraries or external chart APIs.

   - Build a simple candlestick chart using custom SVG/React.

   - Also provide a line chart fallback.

   - Chart must work offline.

6. Full version:

   - No paywall.

   - No locked features.

   - No trial message.

   - All features unlocked.

APP PURPOSE

The app helps an agricultural commodity trader answer:

- What is today’s price?

- Is price rising or falling?

- Why did price move?

- Is there buying pressure or selling pressure?

- Which goods have low supply?

- Which goods have high demand?

- Which goods are in harvest season?

- Which goods are in lean supply season?

- What notes were attached to previous candles/days?

DATA MODEL

Create TypeScript types and local storage collections for:

1. Good

   - id: string

   - name: string

   - category?: string

   - unit: string

   - grade?: string

   - marketLocation?: string

   - currency: string

   - archived: boolean

   - createdAt: string

2. PriceEntry

   - id: string

   - goodId: string

   - date: string, format YYYY-MM-DD

   - close: number, required

   - open?: number

   - high?: number

   - low?: number

   - supply: "high" | "normal" | "low"

   - demand: "low" | "normal" | "high"

   - stockLevel?: "low" | "normal" | "high"

   - volumeEstimate?: number

   - source?: string

   - createdAt: string

   - updatedAt: string

   Important:

   - supply "high" means abundant supply.

   - supply "low" means shortage/low supply.

   - demand "high" means strong buyer demand.

   - There should be only one price entry per good per date.

   - If user tries to add a price for the same good and same date, open the existing entry for editing instead of creating duplicate.

3. Note

   - id: string

   - goodId: string

   - date: string, format YYYY-MM-DD

   - priceId?: string

   - direction: "up" | "down" | "neutral"

   - reasonTag: string

   - text: string

   - impact: "low" | "medium" | "high"

   - createdAt: string

4. SeasonProfile

   - goodId: string

   - plantingMonths: number[]

   - growingMonths: number[]

   - harvestMonths: number[]

   - peakSupplyMonths: number[]

   - leanMonths: number[]

   - notes?: string

   Months are numbers from 1 to 12.

   Example: January = 1, December = 12.

REASON TAGS FOR NOTES

Use these preset reason tags:

- harvest_arrival

- low_supply

- high_demand

- export_demand

- local_demand

- rain

- drought

- flood

- transport_cost

- fuel_cost

- currency_change

- festival_demand

- government_policy

- import_competition

- quality_issue

- storage_loss

- panic_selling

- sellers_holding_stock

- buyers_waiting

- substitute_price

- other

SCREENS AND NAVIGATION

Create bottom navigation for mobile:

1. Dashboard

2. Goods

3. Add Price

4. Notes

5. Settings

Also create these pages/modals:

A. Dashboard

Show summary cards:

- Strong Buying Pressure goods

- Strong Selling Pressure goods

- Low Supply and High Demand goods

- Harvest This Month

- Lean Supply This Month

Show an "Opportunity Board" table with columns:

- Good

- Latest Price

- 3D Change

- 7D Change

- Supply

- Demand

- Pressure

- Season

- Pressure Label

Pressure color:

- Green for positive buying pressure

- Red for selling pressure

- Gray for neutral

Rows should link to Good Detail page.

B. Goods List

Show all active goods.

Each good row should show:

- Name

- Category

- Unit

- Latest price

- Daily change if available

- 7-day change if available

- Supply label

- Demand label

- Pressure label

- Season status

Include:

- Search bar

- Add Good button

- Show archived toggle

- Tap good to open Good Detail

C. Add/Edit Good

Fields:

- Name, required

- Category

- Unit, required, default "kg"

- Grade

- Market/Location

- Currency, default text field

- Archived toggle when editing

Validation:

- Name required

- Unit required

D. Good Detail

This is the main analysis screen.

Show:

- Good name

- Category

- Unit

- Currency

- Latest price

- Price change

- Supply

- Demand

- Pressure score

- Pressure label

- Current season status

- Harvest alert if relevant

- Lean supply alert if relevant

Tabs:

1. Chart

2. Price History

3. Notes

4. Season

Good Detail actions:

- Add Price

- Add Note

- Edit Good

- Archive Good

- Delete Good

Delete Good:

- Show confirmation dialog.

- If good has price history, recommend archive instead.

- If permanent delete is chosen, delete good, its price entries, notes, and season profile.

E. Chart Tab

Chart requirements:

- Show price history for selected good.

- Date range selector: 30 days, 90 days, 180 days, all.

- Chart type selector: Auto, Line, Candles.

Auto mode:

- If enough candle data exists, show candles.

- If only close prices exist, show line chart.

Line chart:

- Use close prices.

- Show dots for dates with notes.

- Tap/click point opens detail modal.

Candle chart:

- Use open, high, low, close.

- If open is missing, use previous close as open.

- If high or low is missing, do not fake candle. Use line chart fallback.

- Green candle if close is greater than or equal to open.

- Red candle if close is less than open.

- Show a small dot or badge on candles that have notes.

- Tap/click candle opens Candle Detail modal.

Candle Detail modal shows:

- Date

- Open

- High

- Low

- Close

- Change from previous close

- Supply

- Demand

- Pressure score

- Pressure label

- Notes for that date

- Add Note button

- Edit Price button

F. Price History Tab

Table of price entries sorted by date descending.

Columns:

- Date

- Close

- Open

- High

- Low

- Supply

- Demand

- Source

- Actions

Actions:

- Edit

- Delete

Include Add Price button.

G. Add/Edit Price

Fields:

- Good, dropdown, required

- Date, required, default today

- Close, required, number

- Open, optional number

- High, optional number

- Low, optional number

- Supply, required select:

  - High Supply / Abundant

  - Normal Supply

  - Low Supply / Shortage

- Demand, required select:

  - Low Demand

  - Normal Demand

  - High Demand

- Stock Level, optional:

  - Low Stock

  - Normal Stock

  - High Stock

- Volume Estimate, optional number

- Source, optional text

Validation:

- Good required

- Date required

- Close required and must be number

- Prevent duplicate price for same good and date.

- If duplicate, edit existing entry.

H. Notes List

Show all notes sorted by date descending.

Filters:

- Filter by good

- Filter by reason tag

- Filter by direction

Each note row shows:

- Date

- Good name

- Direction icon/label

- Reason tag

- Note text preview

- Impact

Tap note to edit/delete.

I. Add/Edit Note

Fields:

- Good, dropdown, required

- Date, required, default today

- Direction, required:

  - Price Up

  - Price Down

  - Neutral

- Reason Tag, required dropdown

- Impact:

  - Low

  - Medium

  - High

- Note text, required

When adding note from candle modal:

- Good and date should be pre-filled.

- If a price entry exists for that good/date, link note to that priceId.

J. Season Tab

Show a 12-month season calendar for the selected good.

Editable month toggles for:

- Planting

- Growing

- Harvest

- Peak Supply

- Lean Supply

Show current season status.

Current season logic priority:

1. If current month is in harvestMonths: "Harvesting"

2. Else if current month is in peakSupplyMonths: "Peak Supply"

3. Else if current month is in leanMonths: "Lean Supply"

4. Else if current month is in plantingMonths: "Planting"

5. Else if current month is in growingMonths: "Growing"

6. Else: "Off Season"

Also show alerts:

- If harvestMonths includes current month: "Harvesting now"

- If harvestMonths includes next month: "Harvest expected next month"

- If leanMonths includes current month: "Lean supply period"

- If peakSupplyMonths includes current month: "Peak supply period"

K. Settings

Settings page must include:

- Export all data as JSON backup

- Import JSON backup

- Export prices as CSV

- Export goods as CSV

- Export notes as CSV

- Load sample data

- Clear all data

- About AgriCandle

- Add to Home Screen instructions for iPhone

Clear all data:

- Require confirmation.

- Delete all local data.

Import JSON:

- Restore goods, prices, notes, seasons.

- Replace current data after confirmation.

BUSINESS LOGIC: PRESSURE SCORE

Use this exact logic.

Demand score:

- demand low = 1

- demand normal = 2

- demand high = 3

Supply tightness score:

- supply high/abundant = 1

- supply normal = 2

- supply low/shortage = 3

Momentum score:

Calculate using latest close price and the closest previous price entry at least 3 calendar days earlier.

If no previous price exists, momentum score = 0.

Percent change formula:

changePercent = ((latestClose - previousClose) / previousClose) * 100

Momentum score:

- changePercent > 3 => +2

- changePercent >= 1 => +1

- changePercent >= -1 and <= 1 => 0

- changePercent >= -3 => -1

- changePercent < -3 => -2

Pressure score:

pressureScore = demandScore + supplyTightnessScore + momentumScore - 4

Clamp pressureScore between -4 and +4.

Pressure label:

- pressureScore >= 3: "Strong Buying Pressure"

- pressureScore >= 1: "Buying Pressure"

- pressureScore === 0: "Neutral"

- pressureScore <= -3: "Strong Selling Pressure"

- pressureScore <= -1: "Selling Pressure"

Calculate pressure for each good using the latest price entry.

BUSINESS LOGIC: PRICE CHANGES

For each good, calculate:

- Daily change: latest close compared to previous available close.

- 3-day change: latest close compared to closest previous entry at least 3 calendar days earlier.

- 7-day change: latest close compared to closest previous entry at least 7 calendar days earlier.

If no previous data exists, show "—".

BUSINESS LOGIC: LOW SUPPLY / HIGH DEMAND

A good is "Low Supply" if latest price entry supply = "low".

A good is "High Demand" if latest price entry demand = "high".

A good is "Low Supply High Demand" if both are true.

Show these in Dashboard.

CHART DETAILS

Build a custom SVG candlestick chart.

Requirements:

- X axis: dates.

- Y axis: price range.

- Wicks show high and low.

- Body shows open and close.

- Green body if close >= open.

- Red body if close < open.

- If many candles, allow horizontal scroll.

- Candle tap/click should work on mobile.

- Show note indicator dot above candles with notes.

- Show empty state if no data.

- Do not generate fake data.

Candle Detail modal:

- Must show all notes for that good and date.

- Must allow adding a new note.

- Must allow editing the price entry.

- Must show reason tags.

LINE CHART

Line chart should:

- Use close prices.

- Show dots on dates with notes.

- Tap/click dot opens same detail modal.

- Use smooth or straight line.

- Show empty state if no data.

SEASON CALENDAR UI

The season editor should show 12 months as toggle buttons.

Months:

Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec.

For each season type, user can select multiple months:

- Planting

- Growing

- Harvest

- Peak Supply

- Lean Supply

Use different colors:

- Planting: green

- Growing: lime

- Harvest: amber

- Peak Supply: orange

- Lean Supply: brown/gray

Show current month highlight.

SAMPLE DATA

Add a "Load Sample Data" button in Settings and also show it in empty state.

Sample data should include:

- 3 goods:

  1. Sesame

  2. Black Gram

  3. Mung Bean

For each good:

- 30 days of price entries.

- Some entries include open/high/low/close.

- Some entries include only close.

- Supply and demand values vary.

- Several notes with reason tags.

- Season profile with planting, growing, harvest, peak supply, lean supply months.

Sample data must be deterministic, not random every time.

EMPTY STATES

If no goods exist:

- Show friendly onboarding.

- Button: Add First Good

- Button: Load Sample Data

If good has no prices:

- Show message: "No prices yet."

- Button: Add Price

If chart has no notes:

- Show "No notes for this date."

If no notes exist globally:

- Show message and Add Note button.

BACKUP AND EXPORT

Export JSON:

- Download a file named agri-candle-backup.json

- Include:

  - goods

  - prices

  - notes

  - seasons

  - exportedAt

Import JSON:

- Accept .json file

- Validate basic structure

- Confirm before replacing current data

CSV export:

- goods.csv

- prices.csv

- notes.csv

CSV price columns:

- Good Name

- Date

- Open

- High

- Low

- Close

- Supply

- Demand

- Stock Level

- Volume Estimate

- Source

PWA / IOS REQUIREMENTS

Make the app installable as a PWA.

Create:

- public/manifest.webmanifest

- public/sw.js or equivalent service worker

- Register service worker in app

Manifest should include:

- name: AgriCandle

- short_name: AgriCandle

- start_url: .

- display: standalone

- theme_color: #16a34a

- background_color: #ffffff

- description: Offline commodity price tracker for agricultural traders

Add iOS meta tags:

- apple-mobile-web-app-capable

- apple-mobile-web-app-status-bar-style

- apple-mobile-web-app-title

- apple-touch-icon if possible

Do not load external fonts or CDN assets.

Service worker should cache the app shell so the app can open offline.

If service worker is difficult, at minimum all app logic must work offline after loading.

VALIDATION AND EDGE CASES

Handle these cases without crashing:

- No goods

- No prices

- No notes

- No season profile

- Missing open/high/low

- Missing previous price for momentum

- Duplicate price date

- Archived goods

- Invalid JSON import

- Invalid CSV ignored safely

- Empty number fields

- Very long good names

- Very long notes

- Large number of entries

DATA PRIVACY

- No telemetry.

- No analytics.

- No external tracking.

- No user accounts.

- All data stays on device.

UI STYLE

Use clean, professional UI:

- Primary green

- White/light background

- Dark text

- Cards with rounded corners

- Subtle shadows

- Simple table design

- Mobile-friendly buttons

- Modal dialogs for forms

- Toast messages for success/error

Use labels:

- "Supply" should be clear: High Supply, Normal Supply, Low Supply.

- "Demand" should be clear: Low Demand, Normal Demand, High Demand.

- Use simple English.

ACCEPTANCE TESTS

Before finishing, check:

1. User can add a good.

2. User can edit and archive a good.

3. User can add a price.

4. Duplicate price for same good/date edits existing entry.

5. User can delete a price.

6. Line chart renders with close-only data.

7. Candle chart renders when high/low data exists.

8. Candle tap opens modal.

9. Candle modal shows notes for that date.

10. User can add note from candle modal.

11. Notes list shows all notes.

12. Dashboard pressure labels are correct.

13. Season calendar can be edited.

14. Current season status is correct.

15. Export JSON downloads.

16. Import JSON restores data.

17. Export CSV works.

18. App works after refresh.

19. App works offline after loaded.

20. No console errors.

IMPORTANT

Generate the full working app, not just an outline.

Do not ask for backend keys.

Do not add authentication.

Do not add external APIs.

Do not add live crypto or stock data.

Do not lock features behind payment.

Make it simple, stable, and offline-first.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/10aa6cf6-06fe-4021-8fd4-658d7ed4416c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
