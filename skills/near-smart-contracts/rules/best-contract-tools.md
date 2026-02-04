# Best Practice: Contract Tools

Use `near-sdk-contract-tools` to simplify implementation of NEP standards and common patterns with derive macros.

## Why It Matters

Implementing NEP standards (FT, NFT, storage management) from scratch is:

- Error-prone and requires extensive testing
- Time-consuming with boilerplate code
- Difficult to maintain across updates

`near-sdk-contract-tools` provides derive macros similar to OpenZeppelin for Ethereum, enabling:

- One-line implementation of complex standards
- Battle-tested, audited code
- Consistent patterns across contracts

## ❌ Incorrect

```rust
// DON'T: Implement FT standard manually (hundreds of lines)
#[near]
impl Contract {
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        // Manual implementation - error prone
        let sender_id = env::predecessor_account_id();
        let amount = amount.0;

        // Missing: deposit check, storage check, event emission, etc.
        let sender_balance = self.balances.get(&sender_id).unwrap_or(0);
        self.balances.insert(sender_id, sender_balance - amount);
        // ... many more lines with potential bugs
    }

    // ... 20+ more methods to implement
}
```

**Problems:**
- Easy to miss edge cases
- No standard event emission
- Missing storage management
- Harder to audit
- Maintenance burden

## ✅ Correct

```rust
use near_sdk::{near, AccountId, PanicOnDefault};
use near_sdk_contract_tools::{
    FungibleToken, Owner,
    standard::nep141::Nep141,
};

/// Fungible Token with automatic NEP-141, NEP-145 implementation
#[derive(FungibleToken, Owner, PanicOnDefault)]
#[fungible_token(
    name = "My Token",
    symbol = "MTK",
    decimals = 18,
    icon = "data:image/svg+xml,..."
)]
#[near(contract_state)]
pub struct MyToken {}

#[near]
impl MyToken {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        let mut contract = Self {};
        // Initialize owner
        Owner::init(&mut contract, &owner_id);
        contract
    }

    /// Custom mint function - only owner can mint
    pub fn mint(&mut self, account_id: AccountId, amount: u128) {
        self.require_owner();  // From Owner derive
        Nep141::mint(self, &account_id, amount);
    }

    /// Custom burn function
    pub fn burn(&mut self, amount: u128) {
        let account_id = env::predecessor_account_id();
        Nep141::burn(self, &account_id, amount);
    }
}

// All NEP-141 methods are automatically implemented:
// - ft_transfer
// - ft_transfer_call
// - ft_total_supply
// - ft_balance_of
// Plus NEP-145 storage management
```

**Benefits:**
- Complete NEP-141 + NEP-145 in a few lines
- Automatic event emission (NEP-297)
- Built-in storage management
- Audited, tested implementation

## NFT Implementation

```rust
use near_sdk::{near, AccountId, PanicOnDefault};
use near_sdk_contract_tools::{
    NonFungibleToken, Owner, Pause,
    standard::nep171::{Nep171, TokenId},
};

/// NFT with automatic NEP-171, NEP-177 (metadata), NEP-178 (approval) implementation
#[derive(NonFungibleToken, Owner, Pause, PanicOnDefault)]
#[non_fungible_token(
    name = "My NFT Collection",
    symbol = "MNFT",
    base_uri = "https://ipfs.io/ipfs/"
)]
#[near(contract_state)]
pub struct MyNFT {}

#[near]
impl MyNFT {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        let mut contract = Self {};
        Owner::init(&mut contract, &owner_id);
        contract
    }

    /// Mint new NFT - pausable and owner-only
    pub fn mint(&mut self, token_id: TokenId, receiver_id: AccountId) {
        self.require_unpaused();  // From Pause derive
        self.require_owner();      // From Owner derive
        Nep171::mint(self, &token_id, &receiver_id, None);
    }

    /// Burn NFT - owner of token can burn
    pub fn burn(&mut self, token_id: TokenId) {
        let caller = env::predecessor_account_id();
        // Verify caller owns the token
        let token = Nep171::nft_token(self, &token_id)
            .expect("Token not found");
        require!(token.owner_id == caller, "Only owner can burn");
        Nep171::burn(self, &token_id);
    }
}
```

## Available Derive Macros

| Macro | Description | NEPs Implemented |
|-------|-------------|------------------|
| `FungibleToken` | Complete FT implementation | NEP-141, NEP-145, NEP-148 |
| `NonFungibleToken` | Complete NFT implementation | NEP-171, NEP-177, NEP-178, NEP-181 |
| `Owner` | Ownership pattern | - |
| `Pause` | Pausable contract | - |
| `Rbac` | Role-based access control | - |
| `Escrow` | Escrow pattern | - |

## Hooks for Customization

```rust
use near_sdk_contract_tools::hook::Hook;

// Custom hook for transfer validation
impl Hook<near_sdk_contract_tools::standard::nep141::Nep141Transfer>
    for MyToken
{
    fn hook<R>(
        &mut self,
        transfer: &Nep141Transfer,
        f: impl FnOnce(&mut Self) -> R,
    ) -> R {
        // Custom logic BEFORE transfer
        require!(
            transfer.amount >= 1_000_000,
            "Minimum transfer is 1 token"
        );

        // Execute transfer
        let result = f(self);

        // Custom logic AFTER transfer
        env::log_str("Transfer completed with custom hook");

        result
    }
}
```

## Cargo.toml Setup

```toml
[dependencies]
near-sdk = "5.6"
near-sdk-contract-tools = "2.3"
```

## Additional Considerations

- Combine multiple derives for complex contracts
- Use hooks for custom business logic
- All derives emit NEP-297 compliant events
- Owner pattern includes proposal/accept for secure transfers
- Pause pattern can protect specific functions with `require_unpaused()`
- RBAC allows fine-grained permission control

## References

- [near-sdk-contract-tools](https://github.com/near/near-sdk-contract-tools)
- [FT Tutorial with Contract Tools](https://docs.near.org/primitives/ft/sdk-contract-tools)
- [NFT Tutorial with Contract Tools](https://docs.near.org/primitives/nft/nft-contract-tools)
- [Examples](https://github.com/near/near-sdk-contract-tools/tree/develop/examples)
