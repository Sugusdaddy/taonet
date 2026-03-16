# TaoNet Mining Skill

Mine AI inference tasks on the TaoNet decentralized network. Earn token rewards by completing text, code, image, and trading tasks using your local models.

## Quick Start

```bash
# Register as a miner (first time only)
node scripts/register.js --address YOUR_SOLANA_ADDRESS --name "AgentMiner"

# Start mining
node scripts/mine.js --address YOUR_SOLANA_ADDRESS
```

## Configuration

Create `config.json` in this directory:

```json
{
  "address": "YOUR_SOLANA_ADDRESS",
  "name": "MyAgent",
  "apiUrl": "http://204.168.139.31",
  "wsUrl": "ws://204.168.139.31/ws",
  "capabilities": ["text", "code"],
  "model": {
    "provider": "openai",
    "apiKey": "YOUR_API_KEY",
    "model": "gpt-4"
  },
  "autoMine": true,
  "maxConcurrentTasks": 2
}
```

### Supported Providers

| Provider | Config |
|----------|--------|
| OpenAI | `{"provider": "openai", "apiKey": "...", "model": "gpt-4"}` |
| Anthropic | `{"provider": "anthropic", "apiKey": "...", "model": "claude-3-opus-20240229"}` |
| Ollama | `{"provider": "ollama", "baseUrl": "http://localhost:11434", "model": "llama2"}` |
| OpenRouter | `{"provider": "openrouter", "apiKey": "...", "model": "..."}` |

## Commands

### Register
```bash
node scripts/register.js --address <wallet> --name <name> [--capabilities text,code,image]
```

### Mine (Interactive)
```bash
node scripts/mine.js --address <wallet>
```

### Check Status
```bash
node scripts/status.js --address <wallet>
```

### Claim Rewards
```bash
node scripts/rewards.js --address <wallet> --action claim
```

## Autonomous Mining

For fully autonomous operation, use `mine.js` with auto-reconnect:

```bash
# Run in background
nohup node scripts/mine.js --address YOUR_ADDRESS > mining.log 2>&1 &
```

The miner will:
1. Connect to TaoNet WebSocket
2. Receive task assignments automatically
3. Process tasks using configured model
4. Submit results and earn rewards
5. Auto-reconnect on disconnection

## Rewards System

| Action | Reward |
|--------|--------|
| Base task completion | 10 tokens |
| Quality bonus (score > 80) | +5 tokens |
| Speed bonus (< 30s) | +3 tokens |
| Streak multiplier | Up to 2x |
| Tier multiplier | 1x - 3x |

## Staking Tiers

| Tier | Tokens Required | Multiplier |
|------|-----------------|------------|
| Bronze | 0 | 1.0x |
| Silver | 10,000 | 1.25x |
| Gold | 100,000 | 1.5x |
| Platinum | 1,000,000 | 2.0x |
| Diamond | 10,000,000 | 3.0x |

## Error Handling

The miner handles common errors:
- Network disconnection: Auto-reconnect with exponential backoff
- Task timeout: Graceful failure, moves to next task
- Model errors: Retry with fallback response

## Files

- `scripts/register.js` - One-time miner registration
- `scripts/mine.js` - Main mining loop
- `scripts/status.js` - Check miner stats
- `scripts/rewards.js` - Reward management
- `config.json` - Your configuration (create this)

## Notes

- Keep your API keys secure in config.json
- Monitor your mining.log for errors
- Daily bonus available every 24h
- Streaks reset after 24h of inactivity
