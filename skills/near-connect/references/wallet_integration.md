# Wallet Integration Guide

Complete guide for integrating your wallet with near-connect.

## Table of Contents

1. [Overview](#overview)
2. [Manifest Specification](#manifest-specification)
3. [Writing the Executor Script](#writing-the-executor-script)
4. [Sandbox API](#sandbox-api)
5. [Testing Your Wallet](#testing-your-wallet)
6. [Publishing Your Wallet](#publishing-your-wallet)

## Overview

Near-connect uses a **sandbox execution model** where wallet integration code runs in isolated iframes. This enables:

- Independent wallet updates without dApp code changes
- Enhanced security through permission-based isolation
- Wallet developers retain full control over their code hosting

### Integration Flow

1. Write executor script implementing `NearWalletBase`
2. Host script on your domain (must be HTTPS)
3. Create manifest entry with metadata and permissions
4. Test with debug wallet registration
5. Submit PR to add manifest to official registry

## Manifest Specification

### Basic Structure

```json
{
  "id": "my-wallet",
  "name": "My Wallet",
  "version": "1.0.0",
  "icon": "https://mysite.com/icon.png",
  "description": "Secure wallet for NEAR",
  "website": "https://mysite.com",
  
  "executor": "https://mysite.com/near-executor.js",
  "type": "sandbox",
  
  "platform": {
    "web": "https://mysite.com",
    "chrome": "https://chrome.google.com/webstore/detail/...",
    "firefox": "https://addons.mozilla.org/...",
    "android": "https://play.google.com/store/apps/details?id=...",
    "ios": "https://apps.apple.com/app/..."
  },
  
  "features": {
    "signMessage": true,
    "signTransaction": false,
    "signAndSendTransaction": true,
    "signAndSendTransactions": true,
    "signInWithoutAddKey": true,
    "mainnet": true,
    "testnet": true
  },
  
  "permissions": {
    "storage": true,
    "allowsOpen": ["https://mysite.com", "https://wallet.mysite.com"],
    "external": ["relay.mysite.com"],
    "walletConnect": false,
    "clipboardRead": false,
    "clipboardWrite": false,
    "usb": false,
    "hid": false
  }
}
```

### Required Fields

- **id**: Unique identifier (kebab-case, e.g., "my-wallet")
- **name**: Display name shown in wallet selector
- **version**: Semantic version of executor script
- **icon**: Square logo/icon URL (recommended: 128x128px)
- **description**: Brief description (1-2 sentences)
- **website**: Official wallet website
- **executor**: HTTPS URL to executor script
- **type**: Must be "sandbox"
- **features**: Capabilities your wallet supports
- **permissions**: Required sandbox permissions

### Platform Links

Provide installation/access links for each platform:

- `web`: Web app URL
- `chrome`: Chrome Web Store link
- `firefox`: Firefox Add-ons link
- `edge`: Edge Add-ons link
- `android`: Google Play Store link
- `ios`: Apple App Store link
- `tga`: Telegram Mini App link

### Features

Declare which operations your wallet supports:

```typescript
{
  "signMessage": true,           // NEP-413 message signing
  "signTransaction": false,       // Sign without sending (rare)
  "signAndSendTransaction": true, // Sign and broadcast single tx
  "signAndSendTransactions": true,// Sign and broadcast multiple txs
  "signInWithoutAddKey": true,   // Connect without adding FAK
  "mainnet": true,               // Mainnet support
  "testnet": true                // Testnet support (optional)
}
```

**Important**: Only declare features you fully support. DApps filter wallets based on these declarations.

### Permissions

#### storage

```json
{ "storage": true }
```

Enables `window.selector.storage` API for persistent data (replaces localStorage in sandbox).

#### allowsOpen

```json
{ "allowsOpen": ["https://wallet.mysite.com", "myapp://"] }
```

Domains/schemes your executor can open via `window.selector.open()`. Required for redirect-based wallets (like MyNearWallet).

#### external

```json
{ "external": ["relay.mysite.com"] }
```

Domains your executor can communicate with via `fetch()` or other network requests.

#### walletConnect

```json
{ "walletConnect": true }
```

Access to `window.selector.walletConnect` (WalletConnect SignClient instance). Required for WalletConnect-based wallets.

#### clipboardRead / clipboardWrite

```json
{
  "clipboardRead": true,
  "clipboardWrite": true
}
```

Clipboard access permissions. Required if your wallet needs to read/write clipboard (e.g., for copying addresses).

#### usb / hid

```json
{
  "usb": true,
  "hid": true
}
```

Hardware device access. Required for Ledger/hardware wallet integrations.

## Writing the Executor Script

Your executor script implements the wallet interface and registers itself with the sandbox.

### Basic Template

```javascript
class MyWallet {
  constructor() {
    this.accounts = [];
  }

  async signIn({ network, contractId, methodNames }) {
    // Implementation: authenticate user and get accounts
    // For web wallets, you might open a popup/redirect
    // For extensions, use injected provider
    
    const accountId = await this.authenticate();
    const publicKey = await this.getPublicKey(accountId);
    
    this.accounts = [{ accountId, publicKey }];
    
    // Optional: Add function call access key if requested
    if (contractId && methodNames) {
      await this.addAccessKey(contractId, methodNames);
    }
    
    return this.accounts;
  }

  async signOut({ network }) {
    this.accounts = [];
    // Clear stored credentials
  }

  async getAccounts({ network }) {
    // Return cached accounts or fetch from wallet
    return this.accounts;
  }

  async signAndSendTransaction({ signerId, receiverId, actions, network }) {
    // 1. Convert actions to NEAR transactions
    // 2. Sign with user's key
    // 3. Broadcast to network
    // 4. Return FinalExecutionOutcome
    
    const outcome = await this.sendTransaction({
      signerId: signerId || this.accounts[0].accountId,
      receiverId,
      actions,
      network
    });
    
    return outcome;
  }

  async signAndSendTransactions({ transactions, network }) {
    const outcomes = [];
    for (const tx of transactions) {
      const outcome = await this.signAndSendTransaction({
        receiverId: tx.receiverId,
        actions: tx.actions,
        network
      });
      outcomes.push(outcome);
    }
    return outcomes;
  }

  async signMessage({ message, recipient, nonce, network }) {
    // NEP-413 message signing
    const accountId = this.accounts[0].accountId;
    const publicKey = this.accounts[0].publicKey;
    
    const payload = createNEP413Payload({ message, recipient, nonce });
    const signature = await this.signPayload(payload);
    
    return { accountId, publicKey, signature };
  }
}

// Register wallet with sandbox
window.selector.ready(new MyWallet());
```

### Key Implementation Notes

#### signIn

- Must return array of `Account` objects: `{ accountId: string, publicKey?: string }`
- Should persist authentication state in storage
- `contractId` and `methodNames` are optional (for function call access keys)
- Use `window.selector.open()` for redirect-based auth flows

#### signOut

- Clear all stored credentials and state
- Use `window.selector.storage.remove()` for cleanup

#### getAccounts

- Should return accounts even if called before signIn (if previously authenticated)
- Empty array indicates not signed in

#### Actions Format

Actions parameter is an array that may contain:

1. **ConnectorAction format** (near-wallet-selector compatible):

```javascript
{
  type: "FunctionCall",
  params: {
    methodName: "ft_transfer",
    args: { receiver_id: "bob.near", amount: "1000" },
    gas: "30000000000000",
    deposit: "1"
  }
}
```

2. **near-api-js Action format**:

```javascript
// From transactions.functionCall() etc.
{ enum: 'functionCall', functionCall: { ... } }
```

Your executor should handle both formats. See [action_types.md](action_types.md) for complete reference.

#### Network Parameter

All methods receive `network: "mainnet" | "testnet"`. Respect this when:
- Selecting RPC endpoints
- Deriving addresses/accounts
- Broadcasting transactions

### Using Sandbox APIs

#### Storage API

```javascript
// Set data
await window.selector.storage.set('auth_token', JSON.stringify(token));

// Get data
const token = await window.selector.storage.get('auth_token');
const parsed = JSON.parse(token);

// Remove data
await window.selector.storage.remove('auth_token');

// List all keys
const keys = await window.selector.storage.keys();
```

**Important**: No localStorage/sessionStorage in sandbox. Use storage API exclusively.

#### Open URL

```javascript
// Open in new tab
window.selector.open('https://wallet.mysite.com/auth', true);

// Open in same window (redirect)
window.selector.open('https://wallet.mysite.com/auth', false);
```

Only URLs matching `allowsOpen` permission patterns are allowed.

#### Get Initial Location

```javascript
// Access original dApp URL (requires "location" permission)
const dappUrl = window.selector.location;
console.log('Called from:', dappUrl);
```

#### WalletConnect Client

```javascript
// Access WalletConnect client (requires "walletConnect" permission)
const client = window.selector.walletConnect;

const { uri, approval } = await client.connect({
  requiredNamespaces: {
    near: {
      chains: ['near:mainnet'],
      methods: ['near_signAndSendTransaction'],
      events: []
    }
  }
});

// Display QR code with `uri`
const session = await approval();
```

### Drawing UI in Iframe

Your executor can render UI within the allocated iframe area:

```javascript
// Create UI elements
const container = document.createElement('div');
container.innerHTML = `
  <h2>Connect to My Wallet</h2>
  <button id="connect-btn">Connect</button>
`;

document.body.appendChild(container);

document.getElementById('connect-btn').addEventListener('click', async () => {
  // Handle connection
});
```

**Note**: The iframe is displayed in a modal overlay. Keep UI minimal and focused.

## Testing Your Wallet

### Local Development

1. **Start Local Server**:

```bash
# Serve your executor script
python3 -m http.server 8000
```

2. **Test in DApp**:

```typescript
const connector = new NearConnector();

// Register your local wallet
await connector.registerDebugWallet({
  id: "my-wallet-dev",
  name: "My Wallet (Dev)",
  version: "0.1.0",
  executor: "http://localhost:8000/executor.js",
  type: "sandbox",
  icon: "http://localhost:8000/icon.png",
  website: "http://localhost",
  description: "Development version",
  platform: {},
  features: {
    signMessage: true,
    signAndSendTransaction: true,
    signAndSendTransactions: true,
    signInWithoutAddKey: true,
    mainnet: true,
    testnet: true
  },
  permissions: {
    storage: true,
    allowsOpen: ["http://localhost:8000"]
  }
});

// Your wallet will appear in selector
await connector.connect("my-wallet-dev");
```

### Testing on Production Sites

Test your wallet on live dApps before submitting to manifest:

```typescript
// On any site using near-connect
const connector = new NearConnector({ /* existing config */ });

// Inject your wallet
await connector.registerDebugWallet({
  id: "my-wallet",
  executor: "https://mysite.com/executor.js",
  // ... rest of manifest
});
```

Debug wallets persist in browser storage. Remove with:

```typescript
await connector.removeDebugWallet("my-wallet");
```

### Common Issues

**Iframe not loading**: Check executor URL is HTTPS (except localhost) and CORS-accessible.

**Storage not persisting**: Ensure `storage: true` in permissions.

**Open URL failing**: Verify URL matches `allowsOpen` patterns.

**postMessage errors**: Ensure you call `window.selector.ready(wallet)` exactly once.

## Publishing Your Wallet

### 1. Host Executor Script

- Must be on **HTTPS** (http:// only for localhost testing)
- Should be versioned (e.g., `/executor-v1.0.0.js`)
- Must be publicly accessible (no auth required)
- Recommended: Use CDN for reliability

### 2. Prepare Manifest Entry

Create manifest JSON following specification above. Example:

```json
{
  "id": "my-wallet",
  "name": "My Wallet",
  "version": "1.0.0",
  "icon": "https://mysite.com/icon-128.png",
  "description": "Secure and user-friendly NEAR wallet",
  "website": "https://mysite.com",
  "executor": "https://cdn.mysite.com/executor-v1.0.0.js",
  "type": "sandbox",
  "platform": {
    "web": "https://app.mysite.com",
    "chrome": "https://chrome.google.com/webstore/detail/my-wallet/abcd..."
  },
  "features": {
    "signMessage": true,
    "signAndSendTransaction": true,
    "signAndSendTransactions": true,
    "signInWithoutAddKey": true,
    "mainnet": true,
    "testnet": false
  },
  "permissions": {
    "storage": true,
    "allowsOpen": ["https://mysite.com", "https://app.mysite.com"]
  }
}
```

### 3. Submit Pull Request

1. Fork [near-selector repository](https://github.com/hot-dao/near-selector)
2. Edit `repository/manifest.json`
3. Add your wallet entry to `wallets` array
4. Submit PR with:
   - Wallet name and description
   - Links to executor script and website
   - Brief explanation of wallet features

### 4. PR Review Checklist

Ensure your submission includes:

- ✅ Executor script is publicly accessible via HTTPS
- ✅ All manifest fields are complete and accurate
- ✅ Features accurately reflect what your wallet supports
- ✅ Permissions are minimal (only what's needed)
- ✅ Icon is square, clear, and properly sized
- ✅ Platform links are valid and working
- ✅ Executor script is tested on multiple dApps

## Updating Your Wallet

To update your wallet integration:

1. **Host new executor version**: `https://mysite.com/executor-v1.1.0.js`
2. **Update manifest**: Change `version` and `executor` URL
3. **Submit PR** to manifest repository

**Important**: All dApps using near-connect will automatically pick up updates within their manifest refresh cycle (typically on page load). No dApp code changes required!

### Versioning Best Practices

- Use semantic versioning: MAJOR.MINOR.PATCH
- Keep old executor versions available for backwards compatibility
- Test updates thoroughly before publishing manifest PR

## Example Executors

See existing wallet implementations in the [repository](https://github.com/hot-dao/near-selector/tree/main/repository):

- **hotwallet.js** - Mobile wallet with QR code auth
- **mnw.js** - Redirect-based web wallet
- **meteor.js** - Extension-based wallet
- **wallet-connect.js** - WalletConnect integration

## Security Considerations

- Never store private keys in browser storage (use hardware security modules or encrypted storage)
- Validate all actions before signing
- Implement transaction preview/confirmation UI
- Use nonce/anti-replay protection for message signing
- Sanitize user inputs in iframe UI (prevent XSS)
- Keep executor script dependencies minimal

## Support

Questions about wallet integration? Contact:

- GitHub Issues: https://github.com/hot-dao/near-selector/issues
- Email: andrey@herewallet.app
