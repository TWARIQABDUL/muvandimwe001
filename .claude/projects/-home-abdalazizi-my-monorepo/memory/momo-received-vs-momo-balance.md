---
name: momo-received-vs-momo-balance
description: In the gym daily report, Momo received (today's takings) is a different figure from Today's Momo (the account balance at closing)
metadata:
  type: project
---

In the daily report, money **received** on Momo is not the same figure as the Momo
**balance**, and the gym tracks both:

- `Momo received` / `Cash received` — how today's income arrived. Derived from
  `payments.payment_method` plus `product_sales.payment_method`. Always sums to
  `Total's income`.
- `Last balance` / `Today's Momo` — what the Momo account reads at closing,
  entered by the manager in the closing note. Includes everything carried over
  from previous days, so it is far larger than a day's takings.

**Why:** the owner reconciles the two. Cash is sometimes moved onto Momo, and
clients overpay or underpay against what they consumed, so the balance drifts
from `last balance + today's takings`. The manager explains the gap in the
closing note, which prints as the trailing `NB:` block.

**How to apply:** never substitute one for the other, and never derive the
balance from the takings. A closing note saved without balances stores them as
`0`, so treat a zero balance as "not recorded" and print nothing rather than
claiming the account is empty.

Related: [[gym-daily-report-format]]
