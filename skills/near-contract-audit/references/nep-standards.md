# NEP Standards Compliance

NEAR Enhancement Proposals (NEPs) define standard interfaces. Use automated NEP-focused checks in your static analysis or testing workflow to verify compliance.

## NEP-141: Fungible Token Standard

**Detector Group / Check Category**: `nep-ft`
**Detectors / Signals**: `nep141-interface`, `self-transfer`, `unregistered-receiver`

### Required Interface

```rust
pub trait FungibleTokenCore {
    /// Transfer tokens to receiver
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    
    /// Transfer tokens and call receiver's ft_on_transfer
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;
    
    /// Total token supply
    fn ft_total_supply(&self) -> U128;
    
    /// Balance of an account
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
}
```

### Key Security Checks
- `self-transfer`: Sender and receiver must be different accounts
- `unregistered-receiver`: Panic if receiver not registered (prevent token loss)

---

## NEP-145: Storage Management Standard

**Detector Group / Check Category**: `nep-storage`
**Detectors / Signals**: `nep145-interface`, `unclaimed-storage-fee`

### Required Interface

```rust
pub trait StorageManagement {
    /// Deposit NEAR for storage
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance;
    
    /// Withdraw excess storage deposit
    fn storage_withdraw(&mut self, amount: Option<U128>) -> StorageBalance;
    
    /// Unregister account and recover storage deposit
    fn storage_unregister(&mut self, force: Option<bool>) -> bool;
    
    /// Get min/max storage bounds
    fn storage_balance_bounds(&self) -> StorageBalanceBounds;
    
    /// Get account's storage balance
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance>;
}

pub struct StorageBalance {
    pub total: U128,
    pub available: U128,
}

pub struct StorageBalanceBounds {
    pub min: U128,
    pub max: Option<U128>,
}
```

### Key Security Checks
- `unclaimed-storage-fee`: Check balance before allowing unregister

---

## NEP-171 & NEP-178: NFT Standards

**Detector Group / Check Category**: `nep-nft`
**Detectors / Signals**: `nep171-interface`, `nft-approval-check`, `nft-owner-check`

### NEP-171 Core Interface

```rust
pub trait NonFungibleTokenCore {
    /// Transfer NFT to receiver
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    );
    
    /// Transfer NFT and call receiver's nft_on_transfer
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool>;
    
    /// Get token info
    fn nft_token(&self, token_id: TokenId) -> Option<Token>;
}
```

### NEP-178 Approval Interface

```rust
pub trait NonFungibleTokenApproval {
    /// Approve account to transfer token
    #[payable]
    fn nft_approve(
        &mut self,
        token_id: TokenId,
        account_id: AccountId,
        msg: Option<String>,
    ) -> Option<Promise>;
    
    /// Revoke approval
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId);
    
    /// Revoke all approvals
    fn nft_revoke_all(&mut self, token_id: TokenId);
    
    /// Check if account is approved
    fn nft_is_approved(
        &self,
        token_id: TokenId,
        approved_account_id: AccountId,
        approval_id: Option<u64>,
    ) -> bool;
}
```

### Key Security Checks
- `nft-approval-check`: Validate approval_id matches during transfer
- `nft-owner-check`: Only owner can approve/revoke

---

## Running All NEP Checks

Use your tooling or test suite to validate all NEP-related checks together across FT, storage management, and NFT interfaces.

## NEP Compliance Checklist

| Standard | Required Methods | Security Checks |
|----------|-----------------|-----------------|
| NEP-141 | ft_transfer, ft_transfer_call, ft_total_supply, ft_balance_of | self-transfer, unregistered-receiver |
| NEP-145 | storage_deposit, storage_withdraw, storage_unregister, storage_balance_bounds, storage_balance_of | unclaimed-storage-fee |
| NEP-171 | nft_transfer, nft_transfer_call, nft_token | nft-approval-check |
| NEP-178 | nft_approve, nft_revoke, nft_revoke_all, nft_is_approved | nft-owner-check |
