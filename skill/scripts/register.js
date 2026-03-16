#!/usr/bin/env node
/**
 * TaoNet Miner Registration
 * Register your agent as a miner on the network
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.TAONET_API || 'http://204.168.139.31';

async function register(options) {
  const { address, name, capabilities = ['text', 'code'] } = options;
  
  console.log('='.repeat(50));
  console.log('TAONET MINER REGISTRATION');
  console.log('='.repeat(50));
  console.log(`Address: ${address}`);
  console.log(`Name: ${name}`);
  console.log(`Capabilities: ${capabilities.join(', ')}`);
  console.log('');
  
  try {
    // Generate a demo signature (in production, sign with wallet)
    const timestamp = Date.now();
    const message = `TaoNet Registration: ${address} at ${timestamp}`;
    const signature = `sig_demo_${Buffer.from(message).toString('base64').slice(0, 32)}`;
    
    const response = await fetch(`${API_URL}/api/miners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        name,
        capabilities,
        signature,
        message,
        timestamp
      })
    });
    
    const data = await response.json();
    
    if (data.success || data.miner) {
      console.log('[SUCCESS] Miner registered!');
      console.log('');
      console.log('Miner Details:');
      console.log(`  ID: ${data.miner?._id || 'N/A'}`);
      console.log(`  Address: ${address}`);
      console.log(`  Tier: ${data.miner?.stakingTier || 'bronze'}`);
      console.log(`  Reputation: ${data.miner?.reputation || 50}`);
      console.log('');
      console.log('Next steps:');
      console.log('  1. Configure your model in config.json');
      console.log('  2. Run: node scripts/mine.js --address ' + address);
      
      // Save to config
      const configPath = path.join(__dirname, '..', 'config.json');
      let config = {};
      
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      config.address = address;
      config.name = name;
      config.capabilities = capabilities;
      config.apiUrl = API_URL;
      config.wsUrl = API_URL.replace('http', 'ws') + '/ws';
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('');
      console.log('[INFO] Config saved to config.json');
      
    } else {
      console.log('[ERROR] Registration failed:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.log('[ERROR] Connection failed:', error.message);
    console.log('');
    console.log('Make sure TaoNet API is accessible at:', API_URL);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    capabilities: ['text', 'code']
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--address':
      case '-a':
        options.address = args[++i];
        break;
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--capabilities':
      case '-c':
        options.capabilities = args[++i].split(',');
        break;
      case '--help':
      case '-h':
        console.log('Usage: node register.js --address <wallet> --name <name> [--capabilities text,code]');
        process.exit(0);
    }
  }
  
  return options;
}

const options = parseArgs();

if (!options.address) {
  console.log('Error: --address required');
  console.log('Usage: node register.js --address <wallet> --name <name>');
  process.exit(1);
}

if (!options.name) {
  options.name = `Agent_${options.address.slice(0, 8)}`;
}

register(options);
