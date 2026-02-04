# Yield & Resume

Use yield/resume pattern to pause contract execution while waiting for external services to provide data.

## Why It Matters

Traditional smart contracts execute synchronously. Yield/Resume enables:

- Waiting for off-chain oracle responses
- Integration with AI/ML services
- External data validation before continuing
- Complex multi-step workflows with external dependencies

The contract yields a cross-contract call to itself, waiting up to ~200 blocks (~2 minutes) for an external service to signal resume.

## ❌ Incorrect

```rust
// DON'T: Panic on timeout
#[private]
pub fn on_external_response(&mut self, response: Option<String>) -> String {
    // WRONG: Panicking reverts state changes made before yield
    response.expect("External service did not respond")
}

// DON'T: Leave resume method unprotected
pub fn respond(&mut self, data: String) {
    // WRONG: Anyone can call this and provide fake data!
    env::promise_yield_resume(&self.yield_id, &data.into_bytes());
}

// DON'T: Forget to clean up state on timeout
pub fn on_response(&mut self, request_id: u64, data: Option<String>) {
    if data.is_some() {
        self.pending_requests.remove(&request_id);  // Only cleanup on success
    }
    // WRONG: State not cleaned up on timeout - storage waste
}
```

**Problems:**
- Panicking on timeout wastes gas and reverts beneficial state changes
- Unprotected resume allows data injection attacks
- Not cleaning up on timeout causes storage bloat

## ✅ Correct

```rust
use near_sdk::{near, env, AccountId, Promise, Gas, GasWeight};
use near_sdk::store::LookupMap;

const YIELD_REGISTER: u64 = 0;

#[near(contract_state)]
pub struct Contract {
    pending_requests: LookupMap<u64, PendingRequest>,
    yield_ids: LookupMap<u64, Vec<u8>>,
    next_id: u64,
    authorized_responders: Vec<AccountId>,
}

#[near(serializers = [borsh, json])]
pub struct PendingRequest {
    pub requester: AccountId,
    pub prompt: String,
    pub created_at: u64,
}

#[near]
impl Contract {
    /// Create a yielded promise that waits for external response
    pub fn request_ai_response(&mut self, prompt: String) -> Promise {
        let request_id = self.next_id;
        self.next_id += 1;

        // Store request data
        self.pending_requests.insert(request_id, PendingRequest {
            requester: env::predecessor_account_id(),
            prompt: prompt.clone(),
            created_at: env::block_timestamp(),
        });

        env::log_str(&format!("Creating yield for request #{}", request_id));

        // Create callback arguments
        let callback_args = serde_json::to_vec(&serde_json::json!({
            "request_id": request_id
        })).unwrap();

        // Create yielded promise
        let promise = env::promise_yield_create(
            "on_ai_response",           // Method to call when resumed
            &callback_args,              // Arguments for callback
            Gas::from_tgas(30),          // Gas for callback execution
            GasWeight(1),                // Gas weight
            YIELD_REGISTER,              // Register to store yield ID
        );

        // Store yield ID for later resume
        let yield_id = env::read_register(YIELD_REGISTER)
            .expect("Failed to read yield ID");
        self.yield_ids.insert(request_id, yield_id);

        promise
    }

    /// External service calls this to provide response
    /// IMPORTANT: Properly gate this method!
    pub fn respond(&mut self, request_id: u64, response: String) -> bool {
        // Verify caller is authorized
        require!(
            self.authorized_responders.contains(&env::predecessor_account_id()),
            "Caller not authorized to respond"
        );

        // Get yield ID
        let yield_id = self.yield_ids.get(&request_id)
            .expect("No pending request with this ID");

        // Prepare response data
        let response_data = serde_json::to_vec(&serde_json::json!({
            "response": response
        })).unwrap();

        // Signal resume
        env::promise_yield_resume(&yield_id, &response_data)
    }

    /// Called when promise resumes (success or timeout)
    #[private]
    pub fn on_ai_response(
        &mut self,
        request_id: u64,
        response: Option<String>,
    ) -> Result<String, String> {
        // ALWAYS clean up state, regardless of success/timeout
        let request = self.pending_requests.remove(&request_id);
        self.yield_ids.remove(&request_id);

        match response {
            Some(data) => {
                env::log_str(&format!(
                    "Request #{} completed successfully",
                    request_id
                ));
                Ok(data)
            }
            None => {
                // Timeout occurred - handle gracefully, DON'T PANIC!
                env::log_str(&format!(
                    "Request #{} timed out after ~200 blocks",
                    request_id
                ));
                // Return error instead of panicking
                Err("Request timed out waiting for external service".to_string())
            }
        }
    }

    /// View pending requests (for external service to query)
    pub fn get_pending_requests(&self, from: u64, limit: u64) -> Vec<(u64, PendingRequest)> {
        self.pending_requests
            .iter()
            .skip(from as usize)
            .take(limit as usize)
            .map(|(id, req)| (*id, req.clone()))
            .collect()
    }
}
```

**Benefits:**
- Graceful timeout handling without panicking
- Protected resume method with authorization
- Proper state cleanup on both success and timeout
- View method for external services to query pending requests

## Timeout Behavior

```rust
// Timeout occurs after ~200 blocks (~2 minutes)
// When timeout happens:
// 1. on_ai_response is called with response = None
// 2. State changes made BEFORE yield are preserved
// 3. State changes in callback are preserved (if no panic)

// IMPORTANT: Don't panic in callback!
// Panicking reverts the callback's state changes
// but yield state changes are already committed
```

## Additional Considerations

- Maximum wait time: ~200 blocks (~2 minutes)
- Allocate sufficient gas for both yield creation and callback
- Always clean up state in callback (success AND timeout)
- Protect resume method with proper access control
- Consider storing yield IDs for multiple concurrent requests
- External service should monitor for pending requests
- Use view methods to expose pending requests to external services

## References

- [Yield & Resume Documentation](https://docs.near.org/smart-contracts/anatomy/yield-resume)
- [Yield Resume Blog Post](https://docs.near.org/blog/yield-resume)
- [Example Implementation](https://github.com/near-examples/yield-resume)
