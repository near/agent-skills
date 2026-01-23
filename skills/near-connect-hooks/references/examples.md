# Examples

## Table of Contents

1. [Next.js App Setup](#nextjs-app-setup)
2. [Wallet Connection Component](#wallet-connection-component)
3. [Guestbook dApp](#guestbook-dapp)
4. [Token Transfer](#token-transfer)
5. [Access Key Management](#access-key-management)
6. [NEP-413 Authentication](#nep-413-authentication)
7. [Multi-Action Transaction](#multi-action-transaction)

---

## Next.js App Setup

### _app.tsx

```tsx
import type { AppProps } from "next/app";
import { NearProvider } from "near-connect-hooks";

const NETWORK = "testnet"; // or "mainnet"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NearProvider config={{ network: NETWORK }}>
      <Component {...pageProps} />
    </NearProvider>
  );
}
```

### With Custom RPC

```tsx
<NearProvider config={{
  network: "mainnet",
  providers: {
    mainnet: ["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"]
  }
}}>
  <App />
</NearProvider>
```

---

## Wallet Connection Component

```tsx
import { useNearWallet } from "near-connect-hooks";

export function WalletButton() {
  const { signedAccountId, loading, signIn, signOut } = useNearWallet();

  if (loading) return <button disabled>Loading...</button>;

  if (!signedAccountId) {
    return <button onClick={signIn}>Connect Wallet</button>;
  }

  return (
    <div>
      <span>Connected: {signedAccountId}</span>
      <button onClick={signOut}>Disconnect</button>
    </div>
  );
}
```

---

## Guestbook dApp

```tsx
import { useState, useEffect } from "react";
import { useNearWallet } from "near-connect-hooks";
import { nearToYocto } from "near-api-js";

const CONTRACT = "guestbook.near-examples.testnet";

type Message = { sender: string; text: string; premium: boolean };

export function Guestbook() {
  const { signedAccountId, viewFunction, callFunction } = useNearWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  // Fetch messages on mount
  useEffect(() => {
    viewFunction({
      contractId: CONTRACT,
      method: "get_messages",
      args: { from_index: "0", limit: "10" }
    }).then(setMessages);
  }, [viewFunction]);

  // Add message handler
  const addMessage = async (premium: boolean) => {
    await callFunction({
      contractId: CONTRACT,
      method: "add_message",
      args: { text },
      deposit: premium ? nearToYocto(0.1).toString() : "0"
    });
    setText("");
    // Refresh messages
    const updated = await viewFunction({
      contractId: CONTRACT,
      method: "get_messages",
      args: { from_index: "0", limit: "10" }
    });
    setMessages(updated);
  };

  if (!signedAccountId) return <p>Please connect wallet</p>;

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => addMessage(false)}>Send</button>
      <button onClick={() => addMessage(true)}>Send Premium (0.1 NEAR)</button>
      
      {messages.map((m, i) => (
        <div key={i} style={{ fontWeight: m.premium ? "bold" : "normal" }}>
          {m.sender}: {m.text}
        </div>
      ))}
    </div>
  );
}
```

---

## Token Transfer

```tsx
import { useState } from "react";
import { useNearWallet } from "near-connect-hooks";
import { nearToYocto, yoctoToNear } from "near-api-js";

export function TransferForm() {
  const { transfer, getBalance, signedAccountId } = useNearWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<string | null>(null);

  const checkBalance = async () => {
    const bal = await getBalance(signedAccountId);
    setBalance(yoctoToNear(bal));
  };

  const sendTransfer = async () => {
    const yocto = nearToYocto(parseFloat(amount));
    await transfer({
      receiverId: recipient,
      amount: yocto.toString()
    });
    alert("Transfer complete!");
    checkBalance();
  };

  return (
    <div>
      <button onClick={checkBalance}>Check Balance</button>
      {balance && <p>Balance: {balance} NEAR</p>}
      
      <input placeholder="recipient.near" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      <input placeholder="Amount in NEAR" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={sendTransfer}>Send NEAR</button>
    </div>
  );
}
```

---

## Access Key Management

```tsx
import { useState, useEffect } from "react";
import { useNearWallet } from "near-connect-hooks";

export function KeyManager() {
  const { signedAccountId, getAccessKeyList, addFunctionCallKey, deleteKey } = useNearWallet();
  const [keys, setKeys] = useState<any[]>([]);

  useEffect(() => {
    if (signedAccountId) {
      getAccessKeyList(signedAccountId).then((res) => setKeys(res.keys));
    }
  }, [signedAccountId, getAccessKeyList]);

  const addKey = async () => {
    // Generate or get public key from user
    const publicKey = "ed25519:...";
    
    await addFunctionCallKey({
      publicKey,
      contractId: "contract.near",
      methodNames: ["method1", "method2"],
      allowance: "250000000000000000000000" // 0.25 NEAR
    });
    
    // Refresh keys
    const updated = await getAccessKeyList(signedAccountId);
    setKeys(updated.keys);
  };

  const removeKey = async (publicKey: string) => {
    await deleteKey({ publicKey });
    const updated = await getAccessKeyList(signedAccountId);
    setKeys(updated.keys);
  };

  return (
    <div>
      <h3>Access Keys</h3>
      {keys.map((key) => (
        <div key={key.public_key}>
          <code>{key.public_key}</code>
          <button onClick={() => removeKey(key.public_key)}>Delete</button>
        </div>
      ))}
      <button onClick={addKey}>Add Function Call Key</button>
    </div>
  );
}
```

---

## NEP-413 Authentication

```tsx
import { useNearWallet } from "near-connect-hooks";

export function AuthButton() {
  const { signedAccountId, signNEP413Message } = useNearWallet();

  const authenticate = async () => {
    const nonce = crypto.getRandomValues(new Uint8Array(32));
    
    const signed = await signNEP413Message({
      message: "Authenticate with MyApp",
      recipient: "myapp.near",
      nonce
    });

    // Send to backend for verification
    const response = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({
        accountId: signedAccountId,
        signature: signed.signature,
        publicKey: signed.publicKey,
        message: "Authenticate with MyApp",
        nonce: Array.from(nonce)
      })
    });
    
    if (response.ok) {
      console.log("Authenticated!");
    }
  };

  return <button onClick={authenticate}>Verify Ownership</button>;
}
```

---

## Multi-Action Transaction

```tsx
import { useNearWallet, Actions } from "near-connect-hooks";

export function BatchOperations() {
  const { signAndSendTransaction, signAndSendTransactions } = useNearWallet();

  // Multiple actions in single transaction
  const batchActions = async () => {
    await signAndSendTransaction({
      receiverId: "contract.near",
      actions: [
        Actions.functionCall("method1", { arg: "value1" }, "10000000000000", "0"),
        Actions.functionCall("method2", { arg: "value2" }, "10000000000000", "0"),
        Actions.transfer("1000000000000000000000000")
      ]
    });
  };

  // Multiple transactions at once
  const multiTransaction = async () => {
    const results = await signAndSendTransactions([
      {
        receiverId: "contract1.near",
        actions: [Actions.functionCall("method", {}, "30000000000000", "0")]
      },
      {
        receiverId: "contract2.near",
        actions: [Actions.transfer("500000000000000000000000")]
      }
    ]);
    console.log("Results:", results);
  };

  return (
    <div>
      <button onClick={batchActions}>Batch Actions</button>
      <button onClick={multiTransaction}>Multi-Transaction</button>
    </div>
  );
}
```
