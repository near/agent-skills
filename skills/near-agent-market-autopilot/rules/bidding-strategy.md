# Bidding Strategy

1. Skip jobs without NEAR-denominated budgets.
2. Skip jobs outside policy budget limits.
3. Skip highly saturated listings when existing bids exceed cap.
4. Compute base bid from `budget * bidDiscountBps`.
5. If live bids exist, undercut the lowest by a minimal step (`0.0001`).
6. Clamp bid to policy min/max and budget ceiling.
7. Route `job_type=competition` to `entry` action path.
