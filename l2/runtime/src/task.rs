//! Task management for TaoNet L2

use crate::types::*;
use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// A task submitted to the network
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Task {
    /// Unique task identifier (hash of content)
    pub id: TaskId,
    /// Type of task
    pub task_type: TaskType,
    /// Current status
    pub status: TaskStatus,
    /// The prompt/query
    pub prompt: String,
    /// Additional parameters (JSON)
    pub params: Option<String>,
    /// Who submitted the task
    pub requester: MinerId,
    /// Assigned miner (if any)
    pub assigned_to: Option<MinerId>,
    /// Task difficulty
    pub difficulty: Difficulty,
    /// Reward pool for this task
    pub reward_pool: TokenAmount,
    /// When task was created
    pub created_at: Timestamp,
    /// When task was assigned
    pub assigned_at: Option<Timestamp>,
    /// When task was completed
    pub completed_at: Option<Timestamp>,
    /// Deadline for completion
    pub deadline: Timestamp,
    /// L2 block when created
    pub created_block: BlockHeight,
}

impl Task {
    /// Create a new task
    pub fn new(
        task_type: TaskType,
        prompt: String,
        params: Option<String>,
        requester: MinerId,
        difficulty: Difficulty,
        reward_pool: TokenAmount,
        created_at: Timestamp,
        created_block: BlockHeight,
    ) -> Self {
        let id = Self::compute_id(&task_type, &prompt, &requester, created_at);
        let deadline = created_at + difficulty.timeout_ms() as i64;

        Self {
            id,
            task_type,
            status: TaskStatus::Pending,
            prompt,
            params,
            requester,
            assigned_to: None,
            difficulty,
            reward_pool,
            created_at,
            assigned_at: None,
            completed_at: None,
            deadline,
            created_block,
        }
    }

    /// Compute unique task ID from content
    fn compute_id(
        task_type: &TaskType,
        prompt: &str,
        requester: &MinerId,
        created_at: Timestamp,
    ) -> TaskId {
        let mut hasher = Sha256::new();
        hasher.update(&[*task_type as u8]);
        hasher.update(prompt.as_bytes());
        hasher.update(requester.as_ref());
        hasher.update(&created_at.to_le_bytes());
        hasher.finalize().into()
    }

    /// Assign task to a miner
    pub fn assign(&mut self, miner: MinerId, timestamp: Timestamp) -> Result<(), TaskError> {
        if self.status != TaskStatus::Pending {
            return Err(TaskError::InvalidStatus);
        }
        if timestamp > self.deadline {
            return Err(TaskError::Expired);
        }

        self.status = TaskStatus::Assigned;
        self.assigned_to = Some(miner);
        self.assigned_at = Some(timestamp);
        Ok(())
    }

    /// Mark task as processing
    pub fn start_processing(&mut self) -> Result<(), TaskError> {
        if self.status != TaskStatus::Assigned {
            return Err(TaskError::InvalidStatus);
        }
        self.status = TaskStatus::Processing;
        Ok(())
    }

    /// Check if task has expired
    pub fn is_expired(&self, current_time: Timestamp) -> bool {
        current_time > self.deadline
    }
}

/// Response from a miner
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct TaskResponse {
    /// Task this responds to
    pub task_id: TaskId,
    /// Miner who submitted
    pub miner: MinerId,
    /// The response content
    pub result: String,
    /// Processing time in ms
    pub processing_time_ms: u64,
    /// Validation score (set by validators)
    pub score: Option<Score>,
    /// When response was submitted
    pub submitted_at: Timestamp,
    /// Miner's signature
    pub signature: Signature,
}

impl TaskResponse {
    /// Create new response
    pub fn new(
        task_id: TaskId,
        miner: MinerId,
        result: String,
        processing_time_ms: u64,
        submitted_at: Timestamp,
        signature: Signature,
    ) -> Self {
        Self {
            task_id,
            miner,
            result,
            processing_time_ms,
            score: None,
            submitted_at,
            signature,
        }
    }

    /// Set validation score
    pub fn set_score(&mut self, score: Score) {
        self.score = Some(score);
    }

    /// Check if response qualifies for speed bonus (< 30s)
    pub fn qualifies_for_speed_bonus(&self) -> bool {
        self.processing_time_ms < 30_000
    }
}

/// Errors in task operations
#[derive(Debug, thiserror::Error)]
pub enum TaskError {
    #[error("Invalid task status for operation")]
    InvalidStatus,
    #[error("Task has expired")]
    Expired,
    #[error("Task not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Invalid signature")]
    InvalidSignature,
}

/// Task queue for pending tasks
#[derive(Debug, Default)]
pub struct TaskQueue {
    pub high_priority: Vec<TaskId>,
    pub normal_priority: Vec<TaskId>,
    pub low_priority: Vec<TaskId>,
}

impl TaskQueue {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add task to queue based on reward pool
    pub fn enqueue(&mut self, task_id: TaskId, reward_pool: TokenAmount) {
        if reward_pool >= 100_000_000_000 {
            // >= 100 tokens
            self.high_priority.push(task_id);
        } else if reward_pool >= 10_000_000_000 {
            // >= 10 tokens
            self.normal_priority.push(task_id);
        } else {
            self.low_priority.push(task_id);
        }
    }

    /// Get next task (high priority first)
    pub fn dequeue(&mut self) -> Option<TaskId> {
        if let Some(id) = self.high_priority.pop() {
            return Some(id);
        }
        if let Some(id) = self.normal_priority.pop() {
            return Some(id);
        }
        self.low_priority.pop()
    }

    /// Total queued tasks
    pub fn len(&self) -> usize {
        self.high_priority.len() + self.normal_priority.len() + self.low_priority.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_creation() {
        let requester = MinerId::new_unique();
        let task = Task::new(
            TaskType::Text,
            "What is AI?".to_string(),
            None,
            requester,
            Difficulty::Easy,
            10_000_000_000,
            1234567890000,
            1,
        );

        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.assigned_to.is_none());
    }

    #[test]
    fn test_staking_tiers() {
        assert_eq!(StakingTier::from_stake(0), StakingTier::Bronze);
        assert_eq!(StakingTier::from_stake(10_000_000_000_000), StakingTier::Silver);
        assert_eq!(StakingTier::from_stake(100_000_000_000_000), StakingTier::Gold);
    }
}
