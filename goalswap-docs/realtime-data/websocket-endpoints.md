# WebSocket Endpoints on X Layer

> Real-time data via WebSocket for GoalSwap's live match updates and event subscriptions.

## Endpoints

| Network | WSS URL |
|---------|---------|
| Mainnet | `wss://xlayerws.okx.com` |
| Mainnet | `wss://ws.xlayer.tech` |
| Testnet | `wss://xlayertestws.okx.com` |
| Flashblocks Mainnet | `wss://ws.xlayer.tech/flashblocks` |
| Flashblocks Testnet | `wss://testws.xlayer.tech/flashblocks` |

## Supported Methods

### eth_subscribe

Subscribe to Ethereum event types:

| Event | Description | Supported |
|-------|-------------|-----------|
| `newHeads` | New block headers | ✅ |
| `logs` | Filtered logs matching topics | ✅ |
| `newPendingTransactions` | Pending tx notifications | ❌ |

### eth_subscribe — newHeads

```json
// Request
{"id": 1, "method": "eth_subscribe", "params": ["newHeads"]}

// Response
{"jsonrpc":"2.0","id":1,"result":"0x4698d49adc4f4590a7a685702a7890a1"}
```

### eth_subscribe — logs

```json
// Request
{"jsonrpc":"2.0","method":"eth_subscribe","params":["logs",{"topics":["0x7bcec107ebaef6075ec44d44bbaceef2832d8ef887883240b63415dd770788e9"]}],"id":0}

// Response
{"jsonrpc":"2.0","id":1,"result":"0x9aebda1c07ed47f78053751ebbbd26d5"}
```

### eth_unsubscribe

```json
// Request
{"id": 1, "method": "eth_unsubscribe", "params": ["0xefa20a66c94a4da7ae18294db6261b42"]}

// Response
{"jsonrpc":"2.0","id":1,"result":true}
```

## For GoalSwap

GoalSwap's **oracle-service** uses its own Socket.io WebSocket (port 8080) for frontend communication, not X Layer's WSS directly. However, X Layer's WSS can be used for:

- **Monitoring hook contract events** (GoalScored, MatchStateUpdated)
- **Tracking block confirmations** for transaction finality
- **Subscribing to pool swap events** via `eth_subscribe` + `logs`

### Connection Example (ethers.js)

```typescript
import { ethers } from 'ethers';

const provider = new ethers.WebSocketProvider('wss://xlayertestws.okx.com');

// Subscribe to new blocks
provider.on('block', (blockNumber) => {
  console.log('New block:', blockNumber);
});

// Subscribe to contract events
const filter = {
  address: '0x...', // Hook contract address
  topics: [ethers.id('GoalScored(bytes32,uint8,uint8,uint16,uint256)')],
};
provider.on(filter, (log) => {
  console.log('Goal scored event:', log);
});
```

### Connection Example (viem)

```typescript
import { createPublicClient, webSocket } from 'viem';
import { xLayerTestnet } from './xlayer-chain';

const client = createPublicClient({
  chain: xLayerTestnet,
  transport: webSocket('wss://xlayertestws.okx.com'),
});

// Watch for new blocks
const unwatch = client.watchBlockNumber({
  onBlockNumber: (blockNumber) => console.log('Block:', blockNumber),
});
```
