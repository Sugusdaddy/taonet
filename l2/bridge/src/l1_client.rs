//! Solana L1 Client

use taonet_runtime::types::*;
use solana_sdk::{
    pubkey::Pubkey,
    signature::Signature as SolSignature,
};
use solana_client::rpc_client::RpcClient;
use std::sync::Arc;

/// L1 Client for interacting with Solana
pub struct L1Client {
    rpc: Arc<RpcClient>,
    bridge_program: Pubkey,
    token_mint: Pubkey,
}

impl L1Client {
    pub fn new(rpc_url: &str, bridge_program: Pubkey, token_mint: Pubkey) -> Self {
        let rpc = Arc::new(RpcClient::new(rpc_url.to_string()));
        Self {
            rpc,
            bridge_program,
            token_mint,
        }
    }

    /// Get current slot
    pub fn get_slot(&self) -> Result<L1Slot, L1ClientError> {
        self.rpc
            .get_slot()
            .map_err(|e| L1ClientError::RpcError(e.to_string()))
    }

    /// Get account balance
    pub fn get_balance(&self, address: &Pubkey) -> Result<u64, L1ClientError> {
        self.rpc
            .get_balance(address)
            .map_err(|e| L1ClientError::RpcError(e.to_string()))
    }

    /// Get token balance
    pub fn get_token_balance(&self, token_account: &Pubkey) -> Result<TokenAmount, L1ClientError> {
        let balance = self
            .rpc
            .get_token_account_balance(token_account)
            .map_err(|e| L1ClientError::RpcError(e.to_string()))?;

        balance
            .amount
            .parse::<u64>()
            .map_err(|_| L1ClientError::ParseError)
    }

    /// Verify transaction exists and is confirmed
    pub fn verify_transaction(&self, signature: &SolSignature) -> Result<bool, L1ClientError> {
        let status = self
            .rpc
            .get_signature_status(signature)
            .map_err(|e| L1ClientError::RpcError(e.to_string()))?;

        Ok(status.is_some() && status.unwrap().is_ok())
    }

    /// Get bridge program state
    pub fn get_bridge_state(&self) -> Result<BridgeProgramState, L1ClientError> {
        let account = self
            .rpc
            .get_account(&self.bridge_program)
            .map_err(|e| L1ClientError::RpcError(e.to_string()))?;

        // TODO: Deserialize bridge program state
        // This would use borsh or anchor's account deserialization

        Ok(BridgeProgramState {
            total_deposited: 0,
            total_withdrawn: 0,
            latest_l2_height: 0,
            latest_state_root: [0u8; 32],
            sequencer: self.bridge_program,
            is_paused: false,
        })
    }

    /// Submit state commitment to L1
    pub async fn submit_state_commitment(
        &self,
        _l2_height: BlockHeight,
        _state_root: Hash,
        _proof_root: Hash,
        _sequencer_keypair: &[u8],
    ) -> Result<SolSignature, L1ClientError> {
        // TODO: Implement actual transaction submission
        // 1. Create instruction with commitment data
        // 2. Build transaction
        // 3. Sign with sequencer keypair
        // 4. Submit and confirm

        Err(L1ClientError::NotImplemented)
    }

    /// Process withdrawal on L1
    pub async fn process_withdrawal(
        &self,
        _user: &Pubkey,
        _amount: TokenAmount,
        _l2_height: BlockHeight,
        _proof: Vec<u8>,
    ) -> Result<SolSignature, L1ClientError> {
        // TODO: Implement withdrawal processing
        // 1. Verify merkle proof against committed state root
        // 2. Transfer tokens from escrow to user
        // 3. Mark withdrawal as processed

        Err(L1ClientError::NotImplemented)
    }

    /// Get recent deposits to bridge
    pub fn get_recent_deposits(&self, _limit: usize) -> Result<Vec<DepositInfo>, L1ClientError> {
        // TODO: Query bridge program logs for deposit events

        Ok(Vec::new())
    }
}

/// Bridge program state on L1
#[derive(Debug, Clone)]
pub struct BridgeProgramState {
    pub total_deposited: TokenAmount,
    pub total_withdrawn: TokenAmount,
    pub latest_l2_height: BlockHeight,
    pub latest_state_root: Hash,
    pub sequencer: Pubkey,
    pub is_paused: bool,
}

/// Deposit info from L1
#[derive(Debug, Clone)]
pub struct DepositInfo {
    pub user: Pubkey,
    pub amount: TokenAmount,
    pub tx_signature: SolSignature,
    pub slot: L1Slot,
}

#[derive(Debug, thiserror::Error)]
pub enum L1ClientError {
    #[error("RPC error: {0}")]
    RpcError(String),
    #[error("Parse error")]
    ParseError,
    #[error("Not implemented")]
    NotImplemented,
    #[error("Transaction failed")]
    TransactionFailed,
}

/// Mock L1 client for testing
pub struct MockL1Client {
    current_slot: L1Slot,
    deposits: Vec<DepositInfo>,
}

impl MockL1Client {
    pub fn new() -> Self {
        Self {
            current_slot: 1000,
            deposits: Vec::new(),
        }
    }

    pub fn advance_slot(&mut self, slots: u64) {
        self.current_slot += slots;
    }

    pub fn add_deposit(&mut self, user: Pubkey, amount: TokenAmount) {
        self.deposits.push(DepositInfo {
            user,
            amount,
            tx_signature: SolSignature::default(),
            slot: self.current_slot,
        });
    }

    pub fn get_slot(&self) -> L1Slot {
        self.current_slot
    }

    pub fn get_deposits(&self) -> &[DepositInfo] {
        &self.deposits
    }
}

impl Default for MockL1Client {
    fn default() -> Self {
        Self::new()
    }
}
