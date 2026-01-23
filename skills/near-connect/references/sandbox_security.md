# Sandbox Security Model

Security architecture and permission system for near-connect wallet executor sandboxes.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Isolation Mechanisms](#isolation-mechanisms)
3. [Permission System](#permission-system)
4. [Communication Protocol](#communication-protocol)
5. [Security Guarantees](#security-guarantees)
6. [Audit Scope](#audit-scope)

## Architecture Overview

Near-connect executes wallet integration code in **sandboxed iframes** to isolate potentially untrusted wallet code from the host dApp.

### Design Goals

1. **Prevent wallet code from accessing dApp state** (cookies, localStorage, DOM)
2. **Enable controlled communication** via postMessage
3. **Grant minimal permissions** through explicit declarations
4. **Allow independent wallet updates** without dApp trust requirements

### Security Model

```
┌─────────────────────────────────────────────┐
│ DApp (Host Page)                            │
│  - Full browser access                      │
│  - User's cookies, storage, DOM             │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ NearConnector                         │ │
│  │  - Manages wallet lifecycle           │ │
│  │  - Creates sandboxed iframes          │ │
│  │  - Proxies wallet calls               │ │
│  │                                       │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │ Sandboxed Iframe                │ │ │
│  │  │  ┌───────────────────────────┐  │ │ │
│  │  │  │ Wallet Executor Script    │  │ │ │
│  │  │  │  - Isolated environment   │  │ │ │
│  │  │  │  - No DOM access          │  │ │ │
│  │  │  │  - No storage access      │  │ │ │
│  │  │  │  - Controlled permissions │  │ │ │
│  │  │  └───────────────────────────┘  │ │ │
│  │  │                                 │ │ │
│  │  │  Communication: postMessage     │ │ │
│  │  └─────────────────────────────────┘ │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Isolation Mechanisms

### Iframe Sandbox Attribute

Wallets execute in iframes with `sandbox="allow-scripts"`:

```html
<iframe sandbox="allow-scripts" srcdoc="..."></iframe>
```

This restricts:
- ❌ Same-origin access (cannot access parent DOM/storage)
- ❌ Form submission
- ❌ Navigation of top-level window
- ❌ Plugins (Flash, etc.)
- ❌ Automatic features (autoplay, etc.)
- ✅ JavaScript execution

### Content Security Policy

Executor code is injected via `srcdoc` (data URL), creating a unique origin:

- Different origin than host dApp
- Cannot access cookies or localStorage of host
- Cannot make same-origin requests to host's API

### Controlled Capabilities

Additional capabilities granted via `iframe.allow` attribute based on permissions:

```typescript
const permissions = [];

if (manifest.permissions.usb) {
  permissions.push("usb *;");
}

if (manifest.permissions.hid) {
  permissions.push("hid *;");
}

if (manifest.permissions.clipboardRead) {
  permissions.push("clipboard-read;");
}

if (manifest.permissions.clipboardWrite) {
  permissions.push("clipboard-write;");
}

iframe.allow = permissions.join(" ");
```

## Permission System

### Available Permissions

#### storage

**Purpose**: Persistent key-value storage for wallet state

**API Provided**:

```javascript
window.selector.storage = {
  set(key, value),
  get(key),
  remove(key),
  keys()
}
```

**Implementation**: Uses IndexedDB scoped to wallet ID

**Security**: Data is isolated per wallet, not accessible cross-wallet or by host dApp

#### allowsOpen

**Purpose**: Allow wallet to open URLs (for redirect-based auth)

**API Provided**:

```javascript
window.selector.open(url, newTab)
```

**Security**:
- Only URLs matching allowed patterns can be opened
- Pattern matching uses domain + path prefix
- Prevents arbitrary navigation

**Example**:

```json
{
  "allowsOpen": [
    "https://wallet.mysite.com",
    "https://auth.mysite.com/callback",
    "myapp://"
  ]
}
```

#### external

**Purpose**: Allow fetch/XHR to specific domains

**Security**:
- Only listed domains accessible via network requests
- CORS still applies (wallet must control domain or use public APIs)
- Prevents data exfiltration to arbitrary servers

**Example**:

```json
{
  "external": ["api.mysite.com", "relay.mynetwork.com"]
}
```

#### walletConnect

**Purpose**: Access WalletConnect SignClient instance

**API Provided**:

```javascript
const client = window.selector.walletConnect;
```

**Security**:
- Shared SignClient instance (to avoid multiple WalletConnect connections)
- Wallet code can only interact with its own sessions
- ProjectId is from host dApp configuration

#### clipboardRead / clipboardWrite

**Purpose**: Read from / write to user's clipboard

**Security**:
- Requires explicit user gesture (browser enforced)
- Used for copy/paste of addresses, QR codes

**Example Use Cases**:
- Copy wallet address
- Paste WalletConnect URI

#### usb / hid

**Purpose**: Access USB/HID devices (for hardware wallets)

**Security**:
- Requires explicit user permission (browser enforced)
- Only granted to trusted hardware wallet integrations

## Communication Protocol

### postMessage Architecture

All communication between host and sandbox uses `window.postMessage`.

#### Message Structure

**Host → Sandbox**:

```typescript
{
  origin: string,        // Unique origin ID for this iframe
  method: string,        // RPC method name
  params: any,           // Method parameters
  id: string            // Request ID
}
```

**Sandbox → Host**:

```typescript
{
  origin: string,        // Same origin ID
  id: string,           // Matching request ID
  result?: any,         // Success result
  error?: string        // Error message
}
```

#### Security Features

1. **Origin Validation**: Each iframe has unique origin ID, messages without matching origin are ignored
2. **No wildcard origins**: postMessage always specifies target origin `"*"` (safe because iframe is unique origin)
3. **Request/Response Pairing**: Request IDs prevent response spoofing

### Method Invocation Flow

```
1. DApp calls wallet.signAndSendTransaction(params)
   ↓
2. NearConnector.wallet() creates SandboxExecutor
   ↓
3. SandboxExecutor creates iframe, loads executor script
   ↓
4. Executor script calls window.selector.ready(walletInstance)
   ↓
5. SandboxExecutor sends "wallet:signAndSendTransaction" message
   ↓
6. Executor script receives message, calls walletInstance.signAndSendTransaction
   ↓
7. Wallet displays UI (in iframe), user confirms
   ↓
8. Executor script posts response message back
   ↓
9. SandboxExecutor resolves promise with result
   ↓
10. DApp receives FinalExecutionOutcome
```

### Executor Registration

Wallet must call `window.selector.ready()` to register:

```javascript
class MyWallet { /* ... */ }

window.selector.ready(new MyWallet());
```

This:
- Signals iframe is ready
- Provides wallet instance for method proxying
- Must be called exactly once

## Security Guarantees

### What Sandbox Prevents

✅ **Prevents**:
- Access to host dApp's cookies
- Access to host dApp's localStorage/sessionStorage
- Reading host dApp's DOM
- Modifying host dApp's DOM
- Making requests to host dApp's API (CORS-protected)
- Navigating the host page
- Accessing user's NEAR private keys (unless explicitly stored by wallet)

### What Sandbox Allows

✅ **Allows** (with permissions):
- Persistent storage (scoped to wallet)
- Network requests to declared domains
- Opening URLs matching allowed patterns
- Clipboard access (with user gesture)
- Hardware device access (with user permission)
- Rendering UI in iframe area

### Attack Surface

**Potential Threats**:

1. **Malicious Wallet Code**
   - Could attempt to phish user within iframe UI
   - Could sign unexpected transactions if user confirms
   - Mitigated by: User must explicitly connect to wallet, wallets reviewed before manifest inclusion

2. **Executor Script Compromise**
   - Attacker compromises wallet's hosting
   - Updates executor to malicious version
   - Mitigated by: Wallets use versioned URLs, HTTPS required, manifest review on version changes

3. **Permission Abuse**
   - Wallet requests excessive permissions
   - Uses `external` to exfiltrate data
   - Mitigated by: Manifest review checks minimal permissions, community oversight

4. **postMessage Hijacking**
   - Attacker tries to inject messages
   - Mitigated by: Origin validation, message signing could be added

## Audit Scope

### Primary Audit Target

The core security boundary is the **SandboxedWallet implementation**:

```
src/SandboxedWallet/
├── index.ts        - Wallet interface implementation
├── executor.ts     - RPC executor and permission checks
├── iframe.ts       - Iframe lifecycle and message handling
└── code.ts         - Sandbox environment injection
```

**Key Questions**:
1. Can wallet executor escape sandbox?
2. Are permissions correctly enforced?
3. Can wallet access host dApp resources?
4. Is postMessage communication secure?

### Secondary Audit Areas

**Permission Enforcement** (`src/SandboxedWallet/executor.ts`):
- Verify `checkPermissions()` correctly validates manifest
- Ensure URL allowlist matching is strict
- Confirm storage isolation

**Message Handling** (`src/SandboxedWallet/iframe.ts`):
- Verify origin validation
- Check for message injection vulnerabilities
- Ensure proper cleanup on dispose

**Storage Isolation** (`src/helpers/indexdb.ts`):
- Confirm IndexedDB is scoped per wallet
- Verify no cross-wallet data leakage

**Action Encoding** (`src/actions/index.ts`):
- Validate action conversion doesn't introduce vulnerabilities
- Check for unexpected action types

**Popup Security** (`src/popups/`):
- Verify modal overlay prevents clickjacking
- Check for XSS in wallet name/description rendering

### Out of Scope

❌ **Not in audit scope**:
- Individual wallet executor scripts (responsibility of wallet teams)
- NEAR protocol transaction security (upstream)
- Browser security model (assumed correct)

### Security Best Practices for Wallets

Wallet developers should:

1. **Never store private keys in storage API** (use hardware security or encrypted storage)
2. **Validate all actions before signing** (prevent blind signing)
3. **Sanitize UI inputs** (prevent XSS in iframe)
4. **Use HTTPS for executor hosting** (prevent MITM)
5. **Implement transaction preview** (show user what they're signing)
6. **Use nonce/replay protection** (for message signing)

## Future Enhancements

Potential security improvements:

1. **Signed Messages**: Cryptographically sign postMessages to prevent injection
2. **CSP Headers**: Add Content-Security-Policy to executor injection
3. **Subresource Integrity**: Validate executor script hash
4. **Permission Revocation**: Allow users to revoke wallet permissions
5. **Audit Logs**: Log wallet method calls for transparency

## Reporting Security Issues

Found a security vulnerability? Please report responsibly:

- **Email**: andrey@herewallet.app
- **GitHub Security**: https://github.com/hot-dao/near-selector/security/advisories/new

Do NOT disclose publicly until patch is available.
