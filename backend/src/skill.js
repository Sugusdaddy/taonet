module.exports = `# TaoNet Skill

Decentralized AI inference network. Holders run models, earn rewards.

## Base URL
\`https://api.taonet.ai\` (or configured endpoint)

## Authentication
Most endpoints require wallet signature. Use \`/api/auth/challenge/:address\` to get a message, sign with wallet, then include signature in requests.

## Endpoints

### Network Stats
\`\`\`
GET /api/stats
\`\`\`
Returns: totalMiners, activeMiners, completedTasks, totalRewards

### Submit Task
\`\`\`
POST /api/tasks/submit
Content-Type: application/json

{
  "type": "text|image|code|trading|custom",
  "prompt": "Your query here",
  "params": {
    "model": "optional model preference",
    "maxTokens": 1000,
    "temperature": 0.7
  },
  "requester": "wallet_address",
  "rewardPool": "1000000000000000000"
}
\`\`\`
Returns: { taskId, status }

### Get Task Result
\`\`\`
GET /api/tasks/:taskId/result?timeout=30000
\`\`\`
Waits for completion (up to timeout ms). Returns: { result, miner, score }

### Register as Miner
\`\`\`
POST /api/miners/register
Content-Type: application/json

{
  "address": "0x...",
  "signature": "0x...",
  "message": "TaoNet registration...",
  "name": "My Miner",
  "hardware": {
    "gpu": "RTX 4090",
    "vram": 24,
    "modelTypes": ["text", "image"]
  }
}
\`\`\`

### Miner WebSocket
\`\`\`
ws://api.taonet.ai/ws

// Auth
{"type": "auth", "address": "0x...", "signature": "0x..."}

// Receive tasks
{"type": "new_task", "task": {...}}

// Submit response
{"type": "task_response", "address": "0x...", "payload": {"taskId": "...", "response": {...}}}

// Heartbeat
{"type": "heartbeat", "address": "0x..."}
\`\`\`

### Leaderboard
\`\`\`
GET /api/stats/leaderboard?sortBy=rewards&limit=50
\`\`\`
sortBy: rewards | score | reputation | tasks

### Rewards
\`\`\`
GET /api/rewards/pending/:address
GET /api/rewards/history/:address
GET /api/rewards/stats
\`\`\`

## Task Types
- **text**: Text generation, Q&A, summarization
- **image**: Image generation/analysis
- **code**: Code generation, debugging
- **trading**: Price predictions, market analysis
- **custom**: Any other AI task

## How Rewards Work
1. Tasks have a \`rewardPool\` in token wei
2. Best response gets 70% of pool
3. Other valid responses (score >= 50) split 30%
4. Rewards accumulate until distributed on-chain

## Becoming a Miner
1. Hold minimum token amount (configurable)
2. Register via API
3. Connect via WebSocket
4. Receive and complete tasks
5. Earn rewards based on response quality

## Example: Submit and Get Result
\`\`\`javascript
// Submit task
const { taskId } = await fetch('/api/tasks/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'text',
    prompt: 'What is the meaning of life?',
    rewardPool: '1000000000000000000'
  })
}).then(r => r.json());

// Wait for result
const { result } = await fetch(\`/api/tasks/\${taskId}/result?timeout=30000\`)
  .then(r => r.json());
\`\`\`
`;
