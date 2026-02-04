# Best Practice: NEP-297 Structured Events

Use NEP-297 standard event format for structured logging that indexers and explorers can parse.

## Why It Matters

NEP-297 defines a standard format for contract events that:

- Enables indexers (The Graph, Pikespeak, etc.) to parse events
- Provides structured data for analytics and monitoring
- Creates auditable event history on-chain
- Allows building reactive systems that respond to contract events

## ❌ Incorrect

```rust
// DON'T: Use unstructured log messages
env::log_str("Token transferred");

// DON'T: Use inconsistent formats
env::log_str(&format!("transfer: {} -> {} amount {}", from, to, amount));

// DON'T: Forget to include required NEP-297 fields
log!(r#"{{"event":"transfer","data":{}}}"#);  // Missing standard and version
```

**Problems:**
- Indexers cannot reliably parse unstructured logs
- Inconsistent formats break downstream systems
- Missing fields make events non-compliant with NEP-297

## ✅ Correct

```rust
use near_sdk::{env, log, AccountId};

/// NEP-297 compliant event emission
/// Format: EVENT_JSON:{"standard":"<standard>","version":"<version>","event":"<event>","data":[<data>]}
fn emit_event(standard: &str, version: &str, event: &str, data: &str) {
    log!(
        r#"EVENT_JSON:{{"standard":"{}","version":"{}","event":"{}","data":[{}]}}"#,
        standard,
        version,
        event,
        data
    );
}

// Example: FT Transfer Event (NEP-141)
fn emit_ft_transfer(
    old_owner_id: &AccountId,
    new_owner_id: &AccountId,
    amount: u128,
    memo: Option<&str>,
) {
    let memo_str = memo.map(|m| format!(r#","memo":"{}""#, m)).unwrap_or_default();
    emit_event(
        "nep141",
        "1.0.0",
        "ft_transfer",
        &format!(
            r#"{{"old_owner_id":"{}","new_owner_id":"{}","amount":"{}"{}}}"#,
            old_owner_id, new_owner_id, amount, memo_str
        ),
    );
}

// Example: NFT Mint Event (NEP-171)
fn emit_nft_mint(owner_id: &AccountId, token_ids: &[String]) {
    let tokens = token_ids
        .iter()
        .map(|id| format!(r#""{}""#, id))
        .collect::<Vec<_>>()
        .join(",");

    emit_event(
        "nep171",
        "1.0.0",
        "nft_mint",
        &format!(
            r#"{{"owner_id":"{}","token_ids":[{}]}}"#,
            owner_id, tokens
        ),
    );
}

// Example: NFT Transfer Event (NEP-171)
fn emit_nft_transfer(
    old_owner_id: &AccountId,
    new_owner_id: &AccountId,
    token_ids: &[String],
    memo: Option<&str>,
) {
    let tokens = token_ids
        .iter()
        .map(|id| format!(r#""{}""#, id))
        .collect::<Vec<_>>()
        .join(",");
    let memo_str = memo.map(|m| format!(r#","memo":"{}""#, m)).unwrap_or_default();

    emit_event(
        "nep171",
        "1.0.0",
        "nft_transfer",
        &format!(
            r#"{{"old_owner_id":"{}","new_owner_id":"{}","token_ids":[{}]{}}}"#,
            old_owner_id, new_owner_id, tokens, memo_str
        ),
    );
}

// Example: Custom Application Event
fn emit_custom_event(user: &AccountId, action: &str, metadata: &str) {
    emit_event(
        "myapp",  // Your application's standard name
        "1.0.0",
        action,
        &format!(
            r#"{{"user":"{}","metadata":{}}}"#,
            user, metadata
        ),
    );
}
```

**Benefits:**
- Compliant with NEP-297 standard
- Parseable by all major indexers
- Consistent format across events
- Reusable event emission function

## Using with near-sdk-contract-tools

```rust
use near_sdk_contract_tools::standard::nep297::Event;

#[derive(Event)]
#[event(standard = "myapp", version = "1.0.0")]
pub enum MyAppEvent {
    #[event(name = "user_registered")]
    UserRegistered {
        user_id: AccountId,
        timestamp: u64,
    },
    #[event(name = "item_purchased")]
    ItemPurchased {
        buyer: AccountId,
        item_id: String,
        price: u128,
    },
}

// Usage
MyAppEvent::UserRegistered {
    user_id: env::predecessor_account_id(),
    timestamp: env::block_timestamp(),
}.emit();
```

## Standard Event Names

| Standard | Events |
|----------|--------|
| nep141 (FT) | `ft_transfer`, `ft_mint`, `ft_burn` |
| nep171 (NFT) | `nft_mint`, `nft_transfer`, `nft_burn` |
| nep145 (Storage) | `storage_deposit`, `storage_withdraw` |

## Additional Considerations

- Always include `standard`, `version`, and `event` fields
- Data should be a JSON array (even for single items)
- Use lowercase snake_case for event names
- Version your events to handle schema changes
- Large numbers should be strings to avoid JSON precision issues
- Emit events AFTER state changes succeed
- Keep event data minimal but sufficient for indexing

## References

- [NEP-297 Standard](https://github.com/near/NEPs/blob/master/neps/nep-0297.md)
- [Events in Contract Standards](https://docs.near.org/smart-contracts/anatomy/events)
- [near-sdk-contract-tools Events](https://github.com/near/near-sdk-contract-tools)
