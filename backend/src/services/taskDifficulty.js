/**
 * TaoNet Task Difficulty System
 * Tasks scale in difficulty and rewards as miners level up
 */

// Difficulty tiers with requirements and multipliers
const DIFFICULTY_TIERS = {
  novice: {
    level: 1,
    name: 'Novice',
    color: '#9ca3af',
    rewardMult: 1.0,
    xpMult: 1.0,
    promptComplexity: 'simple',
    maxTokens: 50,
    examples: ['Say hello', 'What is 2+2?', 'Name a color']
  },
  apprentice: {
    level: 3,
    name: 'Apprentice',
    color: '#22c55e',
    rewardMult: 1.5,
    xpMult: 1.3,
    promptComplexity: 'basic',
    maxTokens: 100,
    examples: ['Explain what AI is in one sentence', 'List 3 programming languages']
  },
  journeyman: {
    level: 5,
    name: 'Journeyman',
    color: '#3b82f6',
    rewardMult: 2.0,
    xpMult: 1.6,
    promptComplexity: 'moderate',
    maxTokens: 200,
    examples: ['Write a haiku about technology', 'Explain blockchain briefly']
  },
  expert: {
    level: 8,
    name: 'Expert',
    color: '#a855f7',
    rewardMult: 3.0,
    xpMult: 2.0,
    promptComplexity: 'complex',
    maxTokens: 300,
    examples: ['Debug this code snippet', 'Analyze this data pattern']
  },
  master: {
    level: 12,
    name: 'Master',
    color: '#f59e0b',
    rewardMult: 5.0,
    xpMult: 2.5,
    promptComplexity: 'advanced',
    maxTokens: 500,
    examples: ['Architect a microservice', 'Optimize this algorithm']
  },
  grandmaster: {
    level: 20,
    name: 'Grandmaster',
    color: '#ef4444',
    rewardMult: 10.0,
    xpMult: 3.0,
    promptComplexity: 'expert',
    maxTokens: 1000,
    examples: ['Design a distributed system', 'Create a trading strategy']
  }
};

// Prompt templates by difficulty
const PROMPT_TEMPLATES = {
  novice: [
    'Say hello in {language}.',
    'What is {number} + {number}?',
    'Name a {category}.',
    'What color is the {object}?',
    'Complete: The quick brown...',
    'True or false: {statement}',
    'What day comes after {day}?'
  ],
  apprentice: [
    'Explain {concept} in one sentence.',
    'List {count} types of {category}.',
    'What is the capital of {country}?',
    'Convert {value} {unit1} to {unit2}.',
    'Define the word: {word}',
    'What year was {event}?',
    'Name {count} {items} that are {adjective}.'
  ],
  journeyman: [
    'Write a short {type} about {topic}.',
    'Compare {thing1} and {thing2}.',
    'Explain how {process} works.',
    'What are pros and cons of {topic}?',
    'Summarize {concept} for a beginner.',
    'Create a {format} for {purpose}.',
    'Translate this to {language}: {text}'
  ],
  expert: [
    'Debug this code: {code}',
    'Optimize this function: {function}',
    'Analyze the pattern in: {data}',
    'Design a solution for: {problem}',
    'Review this architecture: {arch}',
    'Explain {concept} with examples.',
    'Create test cases for: {scenario}'
  ],
  master: [
    'Architect a {system} for {requirements}.',
    'Implement {algorithm} in {language}.',
    'Design a {pattern} for {usecase}.',
    'Analyze security of: {system}',
    'Optimize performance of: {code}',
    'Create a {type} strategy for {goal}.',
    'Build a {component} with {constraints}.'
  ],
  grandmaster: [
    'Design distributed system for: {requirements}',
    'Create ML pipeline for: {task}',
    'Architect blockchain solution for: {problem}',
    'Design real-time {system} at scale.',
    'Implement consensus for: {scenario}',
    'Create trading algorithm for: {market}',
    'Design zero-downtime migration for: {system}'
  ]
};

// Variables for prompt generation
const VARIABLES = {
  language: ['Spanish', 'French', 'German', 'Japanese', 'Portuguese', 'Italian'],
  number: () => Math.floor(Math.random() * 100),
  category: ['fruit', 'animal', 'country', 'planet', 'color', 'sport'],
  concept: ['AI', 'blockchain', 'cloud computing', 'API', 'database', 'encryption'],
  topic: ['technology', 'science', 'space', 'music', 'art', 'history'],
  count: () => Math.floor(Math.random() * 3) + 3,
  day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  word: ['algorithm', 'paradigm', 'iteration', 'recursion', 'abstraction'],
  type: ['poem', 'story', 'description', 'explanation', 'summary'],
  thing1: ['Python', 'React', 'Node.js', 'SQL', 'REST'],
  thing2: ['JavaScript', 'Vue', 'Django', 'NoSQL', 'GraphQL']
};

class TaskDifficulty {
  /**
   * Get appropriate difficulty tier for a miner
   */
  static getTierForMiner(miner) {
    const level = miner.level || 1;
    
    // Find highest tier miner qualifies for
    let selectedTier = 'novice';
    for (const [tierName, tier] of Object.entries(DIFFICULTY_TIERS)) {
      if (level >= tier.level) {
        selectedTier = tierName;
      }
    }
    
    return {
      tier: selectedTier,
      ...DIFFICULTY_TIERS[selectedTier]
    };
  }
  
  /**
   * Generate a task appropriate for miner's level
   */
  static generateTask(miner) {
    const tierInfo = this.getTierForMiner(miner);
    const templates = PROMPT_TEMPLATES[tierInfo.tier];
    
    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Fill in variables
    const prompt = this.fillTemplate(template);
    
    // Calculate rewards
    const baseReward = BigInt('1000000000000000000'); // 1 token
    const reward = BigInt(Math.floor(Number(baseReward) * tierInfo.rewardMult));
    
    return {
      type: 'text',
      prompt,
      difficulty: tierInfo.tier,
      difficultyName: tierInfo.name,
      difficultyColor: tierInfo.color,
      rewardPool: reward.toString(),
      rewardMultiplier: tierInfo.rewardMult,
      xpMultiplier: tierInfo.xpMult,
      maxTokens: tierInfo.maxTokens,
      minLevel: tierInfo.level
    };
  }
  
  /**
   * Fill template with random variables
   */
  static fillTemplate(template) {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      const varDef = VARIABLES[varName];
      if (!varDef) return match;
      
      if (typeof varDef === 'function') {
        return varDef();
      }
      if (Array.isArray(varDef)) {
        return varDef[Math.floor(Math.random() * varDef.length)];
      }
      return varDef;
    });
  }
  
  /**
   * Get all tiers info
   */
  static getAllTiers() {
    return Object.entries(DIFFICULTY_TIERS).map(([key, tier]) => ({
      id: key,
      ...tier
    }));
  }
  
  /**
   * Calculate XP for completing a task at difficulty
   */
  static calculateXP(difficulty, baseXP = 10) {
    const tier = DIFFICULTY_TIERS[difficulty] || DIFFICULTY_TIERS.novice;
    return Math.floor(baseXP * tier.xpMult);
  }
  
  /**
   * Check if miner can attempt difficulty
   */
  static canAttempt(miner, difficulty) {
    const tier = DIFFICULTY_TIERS[difficulty];
    if (!tier) return false;
    return (miner.level || 1) >= tier.level;
  }
}

module.exports = TaskDifficulty;

// Get difficulty tier for a given miner level
TaskDifficulty.getDifficultyForLevel = function(level) {
  const tiers = Object.entries(DIFFICULTY_TIERS)
    .map(([id, tier]) => ({ id, ...tier }))
    .sort((a, b) => b.level - a.level);
  
  for (const tier of tiers) {
    if (level >= tier.level) {
      return tier;
    }
  }
  
  return { id: 'novice', ...DIFFICULTY_TIERS.novice };
};
