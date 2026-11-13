# 24 App — Financial Summary
*What it actually costs to run this app, in three scenarios, with honest commentary*

## How I built this estimate

I'm grounding numbers in what's actually in your codebase today (Expo + local SQLite, no backend, no AI, no auth) and projecting three reasonable trajectories: the minimum to launch on App Store / Play Store, a "we added AI Nova + crash reporting" middle path, and a "we have real users and added cloud sync + monetization" mature path. Pricing is May 2026 list prices for the actual SKUs I'd recommend, not aspirational discounts. Where I'm guessing, I say so.

## Mentor's preamble — read this before the numbers

Three things will distort any number below if you don't think about them clearly.

First, **time is the dominant cost and it's not in this sheet.** If you spend three months evenings-and-weekends on this and your day-job opportunity cost is $50/hr × 200 hours, that's $10,000 in time. The cash cost of running the app is a rounding error against that. Optimize for time, not for the cheapest hosting tier.

Second, **don't add a backend until you have evidence you need one.** Cloud sync is the single most expensive feature you can add. Supabase free tier is fine for the first 500 users, but the moment you grow you pay $25/mo, then $75, then dev time on auth flows, then GDPR/data-deletion plumbing. Local-only is a defensible product position ("your habits never leave your phone") and you should not abandon it cheaply.

Third, **the AI Nova feature has a variable cost that scales with usage, not with revenue.** If you build it before monetization, every active user costs you money. Build the monetization wrapper first, then unlock AI for paid users.

## Scenario A — "Ship what's built" (now → launch)

This is the path I think you should take. No backend, no AI, no auth. Polish, test, ship to stores, see if anyone cares.

**One-time costs.**

Apple Developer Program is $99/year — required to publish on the App Store. Google Play Console is a one-time $25. A domain (e.g. `twenty-four.app`) runs $12–20/yr; you'll need it for the privacy policy URL. App icon and screenshots done on Figma free tier or commissioned on Fiverr/99designs run $0–$300 depending on how fancy you go (you have Nova art already, lean into that — $0–$100 is plenty). Privacy policy from termly.io or iubenda free tier is $0; their paid tier ($10–25/mo) gives you GDPR/CCPA-compliant updates you can ignore until you have users. Trademark search on USPTO is free; filing a trademark on "24" or "Nova" is $250–$350 per class and probably overkill before launch — you can do it once you have traction.

**Recurring monthly cost at launch: ~$8/mo** (Apple Dev amortized at $8.25/mo, domain at ~$1.50/mo). That's it.

**First-year all-in:** $99 Apple + $25 Google + $20 domain + $0–100 for icon polish = **$144–244 total cash**, plus your time.

## Scenario B — "Real product with safety net" (post-launch, growing)

You've shipped. You have 50–500 daily active users. You need to know when things break, see which features people use, and unlock the AI Nova feature for paid users.

**Add on top of Scenario A:**

Sentry crash reporting free tier covers 5,000 errors/mo — fine for this size. Posthog or Amplitude free tier covers 1M events/mo — fine. RevenueCat free tier handles in-app purchases for the first $2,500/mo of revenue (after which they take 1%); this is the right call vs. rolling your own StoreKit logic. App Store Connect Subscriptions: Apple/Google take 15% on the first year of subscription revenue per user (30% after year one for users you didn't bring in via App Store Search Ads, complicated rules apply).

AI Nova via Anthropic API: assuming a Pro user gets ~5 Claude Haiku calls per day for personalized prompts and weekly insights, at ~1K input tokens + 500 output tokens per call, that's ~$0.002 per user-day or ~**$0.06 per active user-month**. For 200 paying users that's $12/mo. If you let free users have it too at 100 active users using it 1× per day, that's another ~$6/mo. Use Haiku 4.5 not Sonnet for these — the use case doesn't need Sonnet. Cache the prompt frequently.

App Store Search Ads experiments: budget $200/mo, expect 50–500 installs depending on keyword competition. This is where you'll find out whether the app has any organic resonance — if you can't keep CAC under your expected LTV (which for a free app with optional $5/mo Pro tier is maybe $10), shut the spend off.

**Recurring monthly at this stage: ~$30–50/mo cash** ($8 Apple/domain + $0 Sentry/PostHog/RevenueCat + $20–30 AI + optional $200 paid acquisition).

**First-year incremental over Scenario A: $360–600 cash** (more if you run paid ads aggressively).

## Scenario C — "We have a real business" (1K+ DAUs, cloud sync, sub revenue)

You've crossed product-market fit. Users want sync, you've decided to build it.

**Add on top of Scenario B:**

Supabase Pro at $25/mo handles the database, auth, and storage for the first 100K monthly active users. You could also pick Firebase, but Supabase's Postgres model fits your existing SQLite schema better. Cloud Functions / Edge Functions for sync conflict resolution are included up to a generous limit.

Push notification delivery via Expo's free EAS push service is fine forever for typical volumes; if you scale past a million pushes a month, you'd reconsider, but that's far away.

Customer support tooling: a free Intercom Lite or a $0 shared inbox via Front/Help Scout's startup plan is plenty. Don't pay for support tooling until you can't keep up with email.

Legal: at this stage a real Terms of Service + Privacy Policy from an actual lawyer is $500–1,500 one-time. Don't skip it once you take money from users.

Accounting / business setup: LLC formation ~$100–300 depending on state, an EIN is free from the IRS, business banking is free at most online banks. Stripe Atlas does the whole thing for $500 if you want to outsource it.

**Recurring monthly at this stage: ~$80–150/mo cash + variable AI/ads scaling with usage.**

**First-year incremental over Scenario B: ~$1,500–3,000** (including legal one-time).

## Summary table (cash only — your time is the bigger number)

| Item                          | Scenario A (Ship) | Scenario B (Growing) | Scenario C (Real biz) |
|-------------------------------|-------------------|----------------------|-----------------------|
| Apple Developer               | $99/yr            | $99/yr               | $99/yr                |
| Google Play (one-time)        | $25               | —                    | —                     |
| Domain                        | $15/yr            | $15/yr               | $15/yr                |
| App icon / screenshots        | $0–100            | —                    | —                     |
| Privacy policy generator      | $0                | $0                   | $0 (replaced by lawyer)|
| Sentry (errors)               | —                 | $0 free tier         | $0 free tier          |
| PostHog/Amplitude (analytics) | —                 | $0 free tier         | $0 free tier          |
| RevenueCat (IAP)              | —                 | $0 free tier         | $0 free tier          |
| Anthropic API (AI Nova)       | —                 | ~$20–30/mo           | ~$50–150/mo variable  |
| App Store Search Ads          | —                 | $0–200/mo optional   | $200–1,000/mo optional|
| Supabase (cloud sync)         | —                 | —                    | $25/mo                |
| Legal (TOS/Privacy)           | —                 | —                    | $500–1,500 one-time   |
| LLC + business setup          | —                 | —                    | $100–500 one-time     |
| **Year 1 cash total**         | **~$150–250**     | **~$500–1,500**      | **~$2,500–6,000**     |
| **Steady-state monthly**      | **~$10**          | **~$30–50**          | **~$80–150**          |

## What I'm deliberately leaving out

I'm not estimating revenue, LTV, CAC, or break-even — those are guesses without data and I'd rather you make them yourself once you have 30 days of usage data. I'm also not pricing a designer, a contract dev, or paid PR. Those are nice-to-have, not need-to-have, and the right time to spend on them is after you know the product works for someone other than you.

## The one number that matters most

**If you can get this app in front of 1,000 people for under $1,500 total and 25% of them open it on day 7, you have a real product.** Below that retention bar, more money won't help. Above it, raise prices, raise spend, raise everything. Don't budget for Scenario C until Scenario A's retention numbers tell you to.
