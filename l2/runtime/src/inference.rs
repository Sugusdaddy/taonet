//! Inference validation and scoring

use crate::types::*;
use crate::task::TaskResponse;

/// Validator for AI inference responses
pub struct InferenceValidator {
    /// Minimum response length
    min_length: usize,
    /// Maximum response length
    max_length: usize,
}

impl Default for InferenceValidator {
    fn default() -> Self {
        Self {
            min_length: 10,
            max_length: 100_000,
        }
    }
}

impl InferenceValidator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Validate and score a response
    pub fn validate(&self, response: &TaskResponse, task_type: TaskType) -> ValidationResult {
        let mut score: u8 = 50; // Base score
        let mut issues = Vec::new();

        // Length checks
        let len = response.result.len();
        if len < self.min_length {
            issues.push(ValidationIssue::TooShort);
            score = score.saturating_sub(20);
        } else if len > self.max_length {
            issues.push(ValidationIssue::TooLong);
            score = score.saturating_sub(10);
        }

        // Type-specific validation
        match task_type {
            TaskType::Code => {
                score = self.validate_code(&response.result, score, &mut issues);
            }
            TaskType::Trading => {
                score = self.validate_trading(&response.result, score, &mut issues);
            }
            TaskType::Text => {
                score = self.validate_text(&response.result, score, &mut issues);
            }
            _ => {}
        }

        // Processing time bonus/penalty
        if response.processing_time_ms < 5000 {
            score = score.saturating_add(10); // Very fast
        } else if response.processing_time_ms < 30000 {
            score = score.saturating_add(5); // Fast
        } else if response.processing_time_ms > 120000 {
            score = score.saturating_sub(10); // Too slow
        }

        ValidationResult {
            score: Score::new(score),
            issues,
            is_valid: score >= 30,
        }
    }

    fn validate_code(&self, result: &str, mut score: u8, issues: &mut Vec<ValidationIssue>) -> u8 {
        // Check for code-like content
        let code_indicators = ["fn ", "def ", "function", "class ", "const ", "let ", "var ", "{", "}"];
        let has_code = code_indicators.iter().any(|ind| result.contains(ind));

        if has_code {
            score = score.saturating_add(15);
        } else {
            issues.push(ValidationIssue::MissingCodeStructure);
            score = score.saturating_sub(15);
        }

        // Check for common syntax elements
        if result.contains("//") || result.contains("#") || result.contains("/*") {
            score = score.saturating_add(5); // Has comments
        }

        score
    }

    fn validate_trading(&self, result: &str, mut score: u8, issues: &mut Vec<ValidationIssue>) -> u8 {
        // Trading signals should be JSON with specific fields
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(result) {
            if json.get("signal").is_some() || json.get("action").is_some() {
                score = score.saturating_add(20);
            }
            if json.get("confidence").is_some() {
                score = score.saturating_add(10);
            }
            if json.get("reason").is_some() || json.get("analysis").is_some() {
                score = score.saturating_add(10);
            }
        } else {
            issues.push(ValidationIssue::InvalidFormat);
            score = score.saturating_sub(20);
        }

        score
    }

    fn validate_text(&self, result: &str, mut score: u8, issues: &mut Vec<ValidationIssue>) -> u8 {
        // Check for coherent sentences
        let sentences = result.split('.').filter(|s| !s.trim().is_empty()).count();
        
        if sentences >= 3 {
            score = score.saturating_add(10);
        } else if sentences == 0 {
            issues.push(ValidationIssue::IncoherentResponse);
            score = score.saturating_sub(10);
        }

        // Check for spam patterns
        let spam_patterns = ["buy now", "click here", "subscribe", "free money"];
        if spam_patterns.iter().any(|p| result.to_lowercase().contains(p)) {
            issues.push(ValidationIssue::SpamDetected);
            score = score.saturating_sub(30);
        }

        score
    }

    /// Compare multiple responses and rank them
    pub fn rank_responses(&self, responses: &mut [TaskResponse], task_type: TaskType) {
        for response in responses.iter_mut() {
            let result = self.validate(response, task_type);
            response.set_score(result.score);
        }

        // Sort by score descending
        responses.sort_by(|a, b| {
            b.score.unwrap_or(Score::new(0)).cmp(&a.score.unwrap_or(Score::new(0)))
        });
    }
}

/// Result of validation
#[derive(Debug)]
pub struct ValidationResult {
    pub score: Score,
    pub issues: Vec<ValidationIssue>,
    pub is_valid: bool,
}

/// Issues found during validation
#[derive(Debug, Clone)]
pub enum ValidationIssue {
    TooShort,
    TooLong,
    MissingCodeStructure,
    InvalidFormat,
    IncoherentResponse,
    SpamDetected,
    DuplicateContent,
    OffTopic,
}

/// Consensus mechanism for selecting best response
pub struct ConsensusEngine {
    /// Minimum responses needed for consensus
    min_responses: usize,
    /// Minimum score to be considered
    min_score: u8,
}

impl Default for ConsensusEngine {
    fn default() -> Self {
        Self {
            min_responses: 1,
            min_score: 40,
        }
    }
}

impl ConsensusEngine {
    pub fn new(min_responses: usize, min_score: u8) -> Self {
        Self { min_responses, min_score }
    }

    /// Select winning response
    pub fn select_winner<'a>(&self, responses: &'a [TaskResponse]) -> Option<&'a TaskResponse> {
        if responses.len() < self.min_responses {
            return None;
        }

        responses
            .iter()
            .filter(|r| r.score.map(|s| s.as_u8() >= self.min_score).unwrap_or(false))
            .max_by_key(|r| r.score.unwrap_or(Score::new(0)))
    }

    /// Calculate reward distribution
    pub fn calculate_rewards(
        &self,
        responses: &[TaskResponse],
        total_pool: TokenAmount,
    ) -> Vec<(MinerId, TokenAmount)> {
        let valid_responses: Vec<_> = responses
            .iter()
            .filter(|r| r.score.map(|s| s.as_u8() >= self.min_score).unwrap_or(false))
            .collect();

        if valid_responses.is_empty() {
            return Vec::new();
        }

        // Winner takes 70%, rest split among others
        let winner_share = total_pool * 70 / 100;
        let others_share = total_pool - winner_share;

        let mut rewards = Vec::new();

        if let Some(winner) = valid_responses.first() {
            rewards.push((winner.miner, winner_share));

            if valid_responses.len() > 1 {
                let share_each = others_share / (valid_responses.len() - 1) as u64;
                for response in valid_responses.iter().skip(1) {
                    rewards.push((response.miner, share_each));
                }
            }
        }

        rewards
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validator() {
        let validator = InferenceValidator::new();
        let response = TaskResponse::new(
            [0u8; 32],
            solana_sdk::pubkey::Pubkey::new_unique(),
            "This is a test response. It has multiple sentences. Should score well.".to_string(),
            5000,
            1234567890000,
            [0u8; 64],
        );

        let result = validator.validate(&response, TaskType::Text);
        assert!(result.is_valid);
        assert!(result.score.as_u8() >= 50);
    }
}
