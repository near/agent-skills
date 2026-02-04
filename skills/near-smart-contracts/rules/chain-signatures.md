# Chain Signatures

Use Chain Signatures to control accounts on other blockchains (Bitcoin, Ethereum, Solana, etc.) from NEAR smart contracts.

## Why It Matters

Chain Signatures enable NEAR accounts and smart contracts to:

- Sign transactions for any blockchain supporting ECDSA or EdDSA
- Control foreign blockchain accounts without bridges
- Build multichain DeFi applications
- Create unified account abstraction across all chains

The MPC (Multi-Party Computation) service signs transactions without any single party controlling the private key.

## ❌ Incorrect

```rust
// DON'T: Try to store private keys in contract
#[near(contract_state)]
pub struct Contract {
    // NEVER store private keys on-chain!
    eth_private_key: String,  // CRITICAL SECURITY ISSUE
}

// DON'T: Assume synchronous signature generation
pub fn sign_eth_tx(&self, payload: Vec<u8>) -> Vec<u8> {
    // MPC signing is async - this won't work
    self.call_mpc_and_return_immediately(payload)
}
```

**Problems:**
- Private keys on-chain are visible to everyone
- MPC signing requires async pattern (yield/resume or callbacks)
- Insufficient gas allocation causes failures

## ✅ Correct

```rust
use near_sdk::{near, env, AccountId, Promise, Gas, NearToken, PromiseResult};
use near_sdk::serde_json::json;

const MPC_CONTRACT_MAINNET: &str = "v1.signer";
const MPC_CONTRACT_TESTNET: &str = "v1.signer-prod.testnet";
const MPC_GAS: Gas = Gas::from_tgas(250);  // MPC needs significant gas

#[near(contract_state)]
pub struct Contract {
    mpc_contract: AccountId,
}

#[near]
impl Contract {
    /// Derive a foreign blockchain address from a NEAR account
    /// The same account + path always derives the same foreign address
    pub fn get_derived_address(&self, path: String) -> String {
        // Address derivation is deterministic based on:
        // 1. NEAR account ID (predecessor or contract)
        // 2. Derivation path (e.g., "ethereum-1", "bitcoin-main")
        // 3. MPC public key (handled by MPC contract)
        format!("Derived from {} with path {}", env::predecessor_account_id(), path)
    }

    /// Request MPC signature for a transaction payload
    /// Use domain_id: 0 for Secp256k1 (Bitcoin, Ethereum)
    /// Use domain_id: 1 for Ed25519 (Solana, NEAR)
    #[payable]
    pub fn sign_transaction(
        &self,
        payload: Vec<u8>,
        path: String,
        domain_id: u32,
    ) -> Promise {
        require!(
            env::attached_deposit() >= NearToken::from_yoctonear(1),
            "Requires at least 1 yoctoNEAR deposit"
        );

        let args = json!({
            "request": {
                "payload": payload,
                "path": path,
                "key_version": 0
            },
            "domain_id": domain_id
        }).to_string().into_bytes();

        Promise::new(self.mpc_contract.clone())
            .function_call(
                "sign".to_string(),
                args,
                NearToken::from_yoctonear(1),
                MPC_GAS,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(20))
                    .on_signature_received()
            )
    }

    #[private]
    pub fn on_signature_received(&self) -> Option<SignatureResponse> {
        match env::promise_result(0) {
            PromiseResult::Successful(data) => {
                env::log_str("MPC signature received successfully");
                // Parse and return signature
                serde_json::from_slice(&data).ok()
            }
            PromiseResult::Failed => {
                env::log_str("MPC signature request failed");
                None
            }
        }
    }
}

#[near(serializers = [json])]
pub struct SignatureResponse {
    pub big_r: String,
    pub s: String,
    pub recovery_id: u8,
}
```

**Benefits:**
- No private keys stored on-chain
- Decentralized MPC signing
- Works with any blockchain
- Deterministic address derivation

## Building Multichain Transactions

Use `omni-transaction-rs` to build transactions for different chains:

```rust
// In Cargo.toml:
// omni-transaction = { git = "https://github.com/near/omni-transaction-rs" }

use omni_transaction::bitcoin::BitcoinTransaction;
use omni_transaction::evm::EvmTransaction;

// Build Bitcoin transaction
let btc_tx = BitcoinTransaction::new()
    .add_input(utxo_txid, utxo_vout)
    .add_output(recipient_address, amount_sats)
    .build();

// Build EVM transaction
let eth_tx = EvmTransaction::new()
    .to(recipient_address)
    .value(amount_wei)
    .gas_limit(21000)
    .build();
```

## Derivation Paths

```rust
// Different paths = different addresses on the same chain
let eth_account_1 = derive_address("ethereum-1");  // 0x1234...
let eth_account_2 = derive_address("ethereum-2");  // 0x5678...
let btc_account = derive_address("bitcoin-main");  // bc1q...

// Same path always derives same address for the same NEAR account
```

## Additional Considerations

- Allocate at least 250 TGas for MPC calls
- The MPC service uses yield/resume internally
- Signatures take ~2-3 seconds to generate
- Same NEAR account + path = same derived address (deterministic)
- External account still needs native tokens for gas on target chain
- Use callbacks to handle signature results

## References

- [Chain Signatures Overview](https://docs.near.org/chain-abstraction/chain-signatures)
- [Implementation Guide](https://docs.near.org/chain-abstraction/chain-signatures/implementation)
- [MPC Contract](https://nearblocks.io/address/v1.signer)
- [Omni Transaction RS](https://github.com/near/omni-transaction-rs)
- [Multichain Examples](https://github.com/near-examples/near-multichain)
