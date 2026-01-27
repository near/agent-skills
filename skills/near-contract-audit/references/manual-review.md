# Manual Review Checklist

Issues beyond automated detection that require human analysis.

## Access Control

### Owner/Admin Functions
- [ ] Owner-only functions check `predecessor_account_id() == owner`
- [ ] Privileged functions use `assert_one_yocto()` for 2FA
- [ ] Owner transfer requires multi-sig or timelock
- [ ] Emergency pause mechanism exists

### Role-Based Access
- [ ] Role assignments properly protected
- [ ] Role checks consistent across related functions
- [ ] No role escalation paths

## Economic Security

### Token Economics
- [ ] Minting/burning properly restricted
- [ ] Total supply invariants maintained
- [ ] Fee calculations don't lose precision
- [ ] Rounding consistently favors protocol (floor) or user (ceil)

### Flash Loan Resistance
- [ ] Price oracles use TWAP or resistant mechanisms
- [ ] Key operations span multiple blocks when needed
- [ ] State changes don't enable single-block exploits

### Sandwich Attack Resistance
- [ ] Slippage protection on swaps
- [ ] MEV-resistant patterns where applicable

## Cross-Contract Interactions

### Promise Chain Safety
- [ ] All promises have callbacks
- [ ] Callbacks handle all PromiseResult variants
- [ ] State updated BEFORE external calls (anti-reentrancy)
- [ ] Callbacks restore state on failure

### Gas Management
- [ ] Sufficient gas reserved for callbacks
- [ ] Gas limits prevent DoS on bounded operations
- [ ] Prepaid gas validated before complex operations

## Storage Security

### Key Collision Prevention
- [ ] All collections use unique storage keys
- [ ] User-supplied data not used in storage keys (or sanitized)
- [ ] Enum-based StorageKey pattern used

### Storage Staking
- [ ] Storage deposits collected before state expansion
- [ ] Storage refunds on state reduction
- [ ] Cannot grief by exhausting storage budget

## Upgrade Safety

### Migration Patterns
- [ ] Upgrade function exists and is owner-protected
- [ ] State migration handles schema changes
- [ ] Rollback possible if migration fails
- [ ] Version field for tracking schema

### Locked Contracts
- [ ] Intentionally non-upgradeable contracts documented
- [ ] Migration path exists if needed

## Input Validation

### Numeric Inputs
- [ ] Amount validations (> 0, within bounds)
- [ ] ID validations (exists, owned)
- [ ] Timestamp validations (not in past/future)

### String Inputs
- [ ] Length limits on user strings
- [ ] Proper escaping if used in logs/events
- [ ] No injection in dynamic key construction

## Denial of Service

### Unbounded Operations
- [ ] No unbounded loops
- [ ] Pagination for large data sets
- [ ] Gas limits enforced

### Resource Exhaustion
- [ ] Cannot create unlimited accounts/tokens
- [ ] Rate limiting where appropriate

## Information Disclosure

### View Functions
- [ ] No sensitive data exposed
- [ ] Private state not leaked through views
- [ ] Error messages don't leak internals

## Code Quality

### Dead Code
- [ ] No unreachable code paths
- [ ] All functions called/tested
- [ ] Unused dependencies removed

### Test Coverage
- [ ] Unit tests for core logic
- [ ] Integration tests for cross-contract flows
- [ ] Edge case testing

## NEAR-Specific

### Account Model
- [ ] Handles account deletion/recreation
- [ ] Doesn't assume account state persistence

### Promise Semantics
- [ ] Understands async execution model
- [ ] State may change between call and callback
- [ ] Block boundaries considered in time-sensitive logic
