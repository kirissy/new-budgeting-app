# Paycheck Budgeting App — Product & Engineering Brief

## 1. Overview

A production-grade personal finance web app that takes a user's income and pay cycle, and automatically works out — every payday — how much should go to fixed living expenses, recurring bills/subscriptions, a goal-based holiday fund, a goal-based emergency fund, and whatever's left over for investing. The core value is removing the manual math: the user enters income + goals once, and the app tells them the exact split every payday, with a percentage breakdown.

**Target users:** individuals managing their own budget (not households/teams), who get paid on a regular cycle and want a "tell me the numbers" tool rather than a generic expense tracker.

**Framework:** Next.js (App Router), TypeScript, Supabase (Auth + Postgres).

---

## 2. Confirmed Decisions

1. **Emergency Fund uses the same goal-based logic as Holiday Fund** — target amount, optional target date, current saved → calculated per-cycle contribution. Taken further: this generalizes into a **Goals feature** — Holiday and Emergency are just two built-in goals, and the user can create additional custom goals (e.g. "New laptop," "Wedding fund") with the exact same mechanic. See §4.4.
2. **Income entered is net/take-home pay** — no tax/deduction handling needed anywhere in the app.
3. **No contribution logging.** The app is a calculator/display tool — it doesn't track or confirm actual payday contributions. `current_saved` on each goal is updated manually by the user whenever they want (e.g. after checking their real savings balance), not auto-incremented by the app.
4. **"Expenses" and "Bills & Subscriptions" are two separate manual-entry sections** that both reduce the investable remainder — Expenses is a flat itemized list assumed to already be in pay-cycle terms (e.g. "food: $50" per cycle), while Bills & Subscriptions have their own frequency that may not match the pay cycle (e.g. Netflix is monthly but you're paid weekly) and need normalization.
5. **Reporting/base currency is set once per user**; individual income, expense, bill, and goal entries can each be tagged with their own currency and get converted to base currency for all calculations and the percentage breakdown.

---

## 3. Core Money Flow (the waterfall)

Every pay cycle, the app computes, in this order:

```
Income (per cycle, converted to base currency)
  − Expenses total (flat sum of itemized living expenses)
  − Bills & Subscriptions total (normalized to pay-cycle equivalent)
  − Goal contributions (Holiday, Emergency, and any custom goals — each goal-based, calculated)
  = Investment amount (the remainder)
```

Expenses is the only "fixed by you" input. Bills/Subscriptions sum is calculated from individual entries. Goal contributions (Holiday, Emergency, custom) are calculated from each goal's target/date/saved math. Investment is always whatever's left — never entered directly.

If the result is negative, the app should surface a clear warning (goals/expenses exceed income) rather than silently showing a negative investment figure.

---

## 4. Feature Breakdown

### 4.1 Income & Pay Cycle Setup
- Manual input: income amount + currency.
- Pay cycle frequency selector: Daily / Weekly / Biweekly / Semi-monthly / Monthly / Annually.
- This frequency is the anchor every other frequency gets normalized against.

### 4.2 Expenses (Spendings)
- Itemized manual list: name + amount + currency per item (e.g. Gym membership, Food, Shopping).
- App sums all items → **Expenses total**, shown per cycle.
- This section stays fixed/manual by design — the user controls it directly, it's not auto-calculated.

### 4.3 Bills & Subscriptions
- Separate section from Expenses. Each entry: name, amount, currency, **its own frequency** (could be monthly, annually, quarterly, etc., independent of the pay cycle), optional next-due-date.
- App normalizes each bill to a per-pay-cycle equivalent (formula in §5.1) and sums them into **Bills total**, so a $180/year subscription correctly contributes a few dollars per weekly paycheck rather than appearing as a $180 hit once a year.

### 4.4 Goals (Holiday, Emergency, and any custom goal — all goal-based)
- A single generalized "Goal" mechanic powers Holiday Fund, Emergency Fund, and any custom goal the user creates (e.g. "New laptop," "Wedding").
- Each goal has: name, type (`holiday` / `emergency` / `custom`), target amount, currency, target date (optional), current amount already saved.
- App calculates how much needs to be set aside each pay cycle to hit the target by the date (formula in §5.2) and recalculates live as target/date/current-saved are edited.
- `current_saved` is updated manually by the user whenever they check their real balance — the app doesn't auto-track or log contributions (see §2.3).
- If a goal is already met, its contribution drops to $0 and it's marked "achieved."
- Optional nice-to-have for Emergency Fund specifically: a "calculate from X months of expenses" convenience helper that pre-fills the target amount field using the Expenses total (§4.2) — under the hood it's still just a normal `target_amount` number, no separate schema needed.
- Holiday and Emergency can be pre-created as defaults during onboarding; anything beyond that is just "add a goal."

### 4.5 Investment (remainder)
- Never entered manually. Always: Income − Expenses − Bills − (sum of all goal contributions).
- Shown per cycle, with a running note if it's gone negative.

### 4.6 Per-Paycycle Breakdown & Percentages
- For every category (Expenses, Bills, each Goal, Investment), show both the absolute amount and its % of income for that cycle.
- Visualized as a donut/bar chart plus a table — this is the main dashboard view.

### 4.7 Multi-Currency
- One base currency per user for all totals/percentages.
- Each individual entry (income, expense, bill, goal) can carry its own currency; converted to base currency at calculation time using stored exchange rates.
- Display both original and converted amounts on entries where they differ.

---

## 5. Calculation Engine — exact formulas

### 5.1 Frequency normalization (for Bills & Subscriptions)
Define an annual multiplier per frequency:

| Frequency | Annual multiplier |
|---|---|
| Daily | 365 |
| Weekly | 52 |
| Biweekly | 26 |
| Semi-monthly | 24 |
| Monthly | 12 |
| Quarterly | 4 |
| Annually | 1 |

```
annual_amount = bill_amount × annual_multiplier(bill_frequency)
per_cycle_amount = annual_amount ÷ annual_multiplier(pay_cycle_frequency)
```
Sum `per_cycle_amount` across all bills = **Bills total**.

### 5.2 Goal-based contribution (any goal: Holiday, Emergency, or custom)
```
remaining_amount = target_amount − current_saved
remaining_cycles = number of full pay cycles between today and target_date
required_per_cycle = remaining_amount ÷ remaining_cycles   (if remaining_cycles > 0)
```
Edge cases:
- `remaining_amount ≤ 0` → contribution = 0, mark goal as achieved.
- `remaining_cycles ≤ 0` (date passed or this cycle) → flag as overdue, surface the full remaining amount as due now rather than dividing by zero.
- No target date set → don't auto-calculate; require either a date or let the user input the contribution manually for that goal.

### 5.3 Investment (remainder)
```
investment = income − expenses_total − bills_total − sum(all goal contributions)
```

### 5.4 Percentage breakdown
```
category_percent = (category_amount ÷ income) × 100
```
Applies to Expenses, Bills, each Goal, and Investment — should sum to ~100%.

---

## 6. Data Model (Supabase / Postgres)

- `profiles` — user_id, base_currency, display preferences
- `pay_profiles` — user_id, income_amount, currency, frequency, effective_date
- `expense_items` — user_id, name, amount, currency
- `bills` — user_id, name, amount, currency, frequency, next_due_date, active
- `goals` — user_id, type (`holiday` / `emergency` / `custom`), name, target_amount, currency, target_date (nullable), current_saved (manually updated by user — no auto-logging)
- `paycycle_snapshots` *(optional, phase 2 — only needed for a history/trend view, not required for the core calculator)* — user_id, cycle_date, income, expenses_total, bills_total, total_goal_contributions, investment_amount, currency
- `exchange_rates` — base_currency, target_currency, rate, fetched_at (refreshed periodically)

Row Level Security on every table, scoped to `auth.uid()`.

---

## 7. Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Backend/DB:** Supabase — Auth, Postgres with RLS, Edge Functions for scheduled exchange-rate refresh
  - **Auth approach (phase 1):** email + password via Supabase Auth, with email confirmation enabled. No extra setup cost, secure by default (Supabase handles hashing/sessions/JWTs), and avoids OAuth app registration overhead this early. Google OAuth and/or magic-link can be added later as a low-effort enhancement once the core app is stable.
- **Styling/UI:** Tailwind CSS + shadcn/ui
- **Forms/validation:** React Hook Form + Zod (shared schemas client + server)
- **Dates/frequency math:** date-fns or Luxon
- **Charts:** Recharts (donut + trend line)
- **Exchange rates:** a currency API (e.g. exchangerate.host) fetched on a schedule, cached in `exchange_rates`
- **Deployment:** Vercel

---

## 8. Non-Functional Requirements (production-grade bar)

- RLS on every table; no client ever reads another user's data.
- Server-side validation mirrors client validation (shared Zod schemas) — never trust client-only checks for financial math.
- Store monetary values as `numeric`/`decimal` in Postgres, not floats; be deliberate about rounding in display vs. storage.
- Unit tests specifically on the calculation engine (§5) — this is the part that has to be correct, independent of UI.
- Mobile-first responsive design (this is a check-from-your-phone-on-payday app).
- Clear empty/loading/error states, and an explicit warning state when investment goes negative.
- Basic accessibility (labeled inputs, sufficient contrast, keyboard navigable forms).

---

## 9. UX Notes

- **Onboarding:** income → pay cycle → base currency → expenses → bills → goals, in that order, mirroring the waterfall.
- **Dashboard:** current cycle breakdown (donut + table with %), days/amount until next payday, goal progress bars for each active goal.
- **Bills manager:** add/edit bill with frequency selector, live preview of its per-cycle equivalent as you type.
- **Goals screens:** add/edit any goal (Holiday, Emergency, or custom) with target amount, target date, current saved — shows required per-cycle contribution live as those change.
- **History:** *(optional, phase 2)* past pay cycles in a table/trend chart, especially investment amount over time.

---

## 10. Suggested Build Phases

1. Auth + income/pay-cycle setup + Expenses CRUD + base calculation engine (Income − Expenses → remainder), basic dashboard.
2. Bills & Subscriptions section with frequency normalization.
3. Generalized Goals feature (Holiday, Emergency, and custom goals) with goal-based contribution math, "achieved" states.
4. Multi-currency support, exchange rate syncing, percentage breakdown visualization, polish/accessibility/tests.

---

*This is an initial brief for a v1 build — details (especially around auth providers, history/trend tracking, and goal types) are expected to be refined as development progresses.*


