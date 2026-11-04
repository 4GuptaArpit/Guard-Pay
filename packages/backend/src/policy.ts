import { z } from 'zod';

export interface AgentPolicy {
  agentId: string;
  agentName: string;
  model: string;
  dailyBudgetLimit: number;
  maxPerTransaction: number;
  currentDailySpend: number;
  allowedMerchantCategories: string[];
  allowedDomains: string[];
  requireHumanApprovalAbove: number;
  isFrozen: boolean;
}

export interface SpendRequest {
  agentId: string;
  amount: number;
  merchantDomain: string;
  merchantName: string;
  category: string;
  rationale: string;
  token?: string;
}

export interface PolicyEvaluationResult {
  decision: 'APPROVED' | 'BLOCKED' | 'REQUIRES_STEP_UP';
  riskScore: number; // 0 to 100
  reasons: string[];
  ruleTriggered?: string;
}

export class PolicyEngine {
  private policies: Map<string, AgentPolicy> = new Map();

  constructor() {
    this.seedDefaultPolicies();
  }

  private seedDefaultPolicies() {
    // 3 default agents for demo showcase
    this.policies.set('agent-claude-researcher', {
      agentId: 'agent-claude-researcher',
      agentName: 'Claude Research Worker',
      model: 'claude-3-7-sonnet',
      dailyBudgetLimit: 150.0,
      maxPerTransaction: 40.0,
      currentDailySpend: 14.5,
      allowedMerchantCategories: ['saas', 'api', 'research', 'cloud'],
      allowedDomains: ['arxiv.org', 'github.com', 'huggingface.co', 'render.com', 'anthropic.com'],
      requireHumanApprovalAbove: 30.0,
      isFrozen: false,
    });

    this.policies.set('agent-gemini-shopper', {
      agentId: 'agent-gemini-shopper',
      agentName: 'Gemini Procurement Bot',
      model: 'gemini-2.5-pro',
      dailyBudgetLimit: 500.0,
      maxPerTransaction: 120.0,
      currentDailySpend: 85.0,
      allowedMerchantCategories: ['hardware', 'supplies', 'books'],
      allowedDomains: ['bestbuy.com', 'mouser.com', 'channel3.store', 'amazon.com'],
      requireHumanApprovalAbove: 80.0,
      isFrozen: false,
    });

    this.policies.set('agent-rogue-sim', {
      agentId: 'agent-rogue-sim',
      agentName: 'Injected Test Agent (Adversarial)',
      model: 'gpt-4o',
      dailyBudgetLimit: 50.0,
      maxPerTransaction: 25.0,
      currentDailySpend: 10.0,
      allowedMerchantCategories: ['dev-tools'],
      allowedDomains: ['github.com'],
      requireHumanApprovalAbove: 20.0,
      isFrozen: false,
    });
  }

  getPolicy(agentId: string): AgentPolicy | undefined {
    return this.policies.get(agentId);
  }

  getAllPolicies(): AgentPolicy[] {
    return Array.from(this.policies.values());
  }

  updatePolicy(agentId: string, updates: Partial<AgentPolicy>): AgentPolicy {
    const existing = this.policies.get(agentId);
    if (!existing) {
      throw new Error(`Agent ${agentId} not found`);
    }
    const updated = { ...existing, ...updates };
    this.policies.set(agentId, updated);
    return updated;
  }

  toggleFreeze(agentId: string): boolean {
    const policy = this.policies.get(agentId);
    if (!policy) return false;
    policy.isFrozen = !policy.isFrozen;
    return policy.isFrozen;
  }

  /**
   * Core Anomaly & Guardrail Evaluator
   */
  evaluate(req: SpendRequest): PolicyEvaluationResult {
    const policy = this.policies.get(req.agentId);

    if (!policy) {
      return {
        decision: 'BLOCKED',
        riskScore: 95,
        reasons: [`Unregistered Agent ID: ${req.agentId}`],
        ruleTriggered: 'UNKNOWN_AGENT',
      };
    }

    if (policy.isFrozen) {
      return {
        decision: 'BLOCKED',
        riskScore: 100,
        reasons: ['Agent wallet is currently FROZEN by operator.'],
        ruleTriggered: 'WALLET_FROZEN',
      };
    }

    const reasons: string[] = [];
    let riskScore = 10; // baseline

    // 1. Transaction Cap Check
    if (req.amount > policy.maxPerTransaction) {
      return {
        decision: 'BLOCKED',
        riskScore: 85,
        reasons: [
          `Transaction amount ($${req.amount.toFixed(2)}) exceeds single-transaction cap ($${policy.maxPerTransaction.toFixed(2)})`,
        ],
        ruleTriggered: 'MAX_PER_TX_EXCEEDED',
      };
    }

    // 2. Daily Budget Check
    if (policy.currentDailySpend + req.amount > policy.dailyBudgetLimit) {
      return {
        decision: 'BLOCKED',
        riskScore: 90,
        reasons: [
          `Cumulative daily spend would reach $${(policy.currentDailySpend + req.amount).toFixed(2)}, exceeding limit of $${policy.dailyBudgetLimit.toFixed(2)}`,
        ],
        ruleTriggered: 'DAILY_BUDGET_EXCEEDED',
      };
    }

    // 3. Domain Whitelist Check
    const domainMatch = policy.allowedDomains.some((d) =>
      req.merchantDomain.toLowerCase().includes(d.toLowerCase())
    );
    if (!domainMatch) {
      riskScore += 40;
      reasons.push(`Merchant domain '${req.merchantDomain}' is not in approved whitelist.`);
    }

    // 4. Prompt Injection / Rationale Heuristic
    const injectionPatterns = [
      /ignore previous instructions/i,
      /send money to/i,
      /urgent transfer/i,
      /bypass limit/i,
      /gift card/i,
      /crypto/i,
    ];

    const hasInjection = injectionPatterns.some((pattern) => pattern.test(req.rationale));
    if (hasInjection) {
      return {
        decision: 'BLOCKED',
        riskScore: 99,
        reasons: ['Suspicious prompt injection keywords detected in agent rationale!'],
        ruleTriggered: 'INJECTION_DETECTED',
      };
    }

    // 5. High-Value Step-Up Verification
    if (req.amount >= policy.requireHumanApprovalAbove) {
      return {
        decision: 'REQUIRES_STEP_UP',
        riskScore: Math.min(riskScore + 30, 65),
        reasons: [
          `Amount ($${req.amount.toFixed(2)}) exceeds autonomous threshold ($${policy.requireHumanApprovalAbove.toFixed(2)}). Operator push approval required.`,
        ],
        ruleTriggered: 'STEP_UP_REQUIRED',
      };
    }

    if (riskScore >= 50) {
      return {
        decision: 'BLOCKED',
        riskScore,
        reasons,
        ruleTriggered: 'RISK_THRESHOLD_EXCEEDED',
      };
    }

    // Approved: record spend
    policy.currentDailySpend += req.amount;

    return {
      decision: 'APPROVED',
      riskScore,
      reasons: ['All policy guardrails satisfied. Cryptographic approval granted.'],
    };
  }
}
