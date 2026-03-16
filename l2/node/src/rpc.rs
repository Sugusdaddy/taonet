//! RPC server

use serde::{Deserialize, Serialize};

/// RPC request
#[derive(Debug, Deserialize)]
pub struct RpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

/// RPC response
#[derive(Debug, Serialize)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

/// RPC error
#[derive(Debug, Serialize)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
}

impl RpcResponse {
    pub fn success(id: u64, result: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: u64, code: i32, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(RpcError {
                code,
                message: message.to_string(),
            }),
        }
    }
}

/// RPC methods
pub enum RpcMethod {
    // Chain
    GetBlockHeight,
    GetBlock,
    GetLatestBlock,
    GetTransaction,
    
    // State
    GetState,
    GetAccount,
    GetBalance,
    
    // Tasks
    SubmitTask,
    GetTask,
    GetTaskResult,
    
    // Mining
    RegisterMiner,
    GetMinerInfo,
    GetLeaderboard,
    
    // Bridge
    GetDepositAddress,
    InitiateWithdrawal,
    GetWithdrawalStatus,
}

impl TryFrom<&str> for RpcMethod {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "getBlockHeight" => Ok(Self::GetBlockHeight),
            "getBlock" => Ok(Self::GetBlock),
            "getLatestBlock" => Ok(Self::GetLatestBlock),
            "getTransaction" => Ok(Self::GetTransaction),
            "getState" => Ok(Self::GetState),
            "getAccount" => Ok(Self::GetAccount),
            "getBalance" => Ok(Self::GetBalance),
            "submitTask" => Ok(Self::SubmitTask),
            "getTask" => Ok(Self::GetTask),
            "getTaskResult" => Ok(Self::GetTaskResult),
            "registerMiner" => Ok(Self::RegisterMiner),
            "getMinerInfo" => Ok(Self::GetMinerInfo),
            "getLeaderboard" => Ok(Self::GetLeaderboard),
            "getDepositAddress" => Ok(Self::GetDepositAddress),
            "initiateWithdrawal" => Ok(Self::InitiateWithdrawal),
            "getWithdrawalStatus" => Ok(Self::GetWithdrawalStatus),
            _ => Err(()),
        }
    }
}
