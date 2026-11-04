#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

const GUARDPAY_API_URL = process.env.GUARDPAY_API_URL || 'http://localhost:4000';

const server = new Server(
  {
    name: 'paypal-agent-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. List Available MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'request_spend_authorization',
        description:
          'Requests policy authorization and executes an autonomous payment via PayPal Orders v2 Sandbox. Protected by GuardPay policy guardrails.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent requesting spend (e.g., agent-claude-researcher)',
            },
            amount: {
              type: 'number',
              description: 'The USD amount to be charged (e.g., 14.50)',
            },
            merchantName: {
              type: 'string',
              description: 'The human-readable name of the merchant (e.g., Render Cloud Services)',
            },
            merchantDomain: {
              type: 'string',
              description: 'The merchant web domain (e.g., render.com)',
            },
            category: {
              type: 'string',
              description: 'Transaction category (e.g., saas, api, cloud, hardware)',
            },
            rationale: {
              type: 'string',
              description: 'Detailed explanation of why this expenditure is required to complete the task.',
            },
          },
          required: ['agentId', 'amount', 'merchantName', 'merchantDomain', 'rationale'],
        },
      },
      {
        name: 'check_agent_budget',
        description: 'Checks the remaining daily budget, max per transaction, and status for an agent wallet.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique agent identifier',
            },
          },
          required: ['agentId'],
        },
      },
      {
        name: 'agent_to_agent_payout',
        description: 'Transfers a micro-payout to another autonomous AI agent using PayPal Payouts API.',
        inputSchema: {
          type: 'object',
          properties: {
            fromAgentId: { type: 'string' },
            toAgentEmail: { type: 'string' },
            amount: { type: 'number' },
            taskDescription: { type: 'string' },
          },
          required: ['fromAgentId', 'toAgentEmail', 'amount', 'taskDescription'],
        },
      },
    ],
  };
});

// 2. Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'request_spend_authorization') {
      const res = await fetch(`${GUARDPAY_API_URL}/api/spend/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const data: any = await res.json();

      if (data.decision === 'APPROVED') {
        return {
          content: [
            {
              type: 'text',
              text: `SUCCESS: Payment of $${(args as any).amount} authorized and captured on PayPal Sandbox.\nPayPal Order ID: ${data.paypalOrderId}\nCapture ID: ${data.paypalCaptureId}\nDual-Key Token: ${data.token}`,
            },
          ],
        };
      } else {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `DENIED by GuardPay Policy: Decision was ${data.decision}.\nRule Triggered: ${data.ruleTriggered || 'POLICY_VIOLATION'}\nReasons: ${data.reasons?.join(', ')}`,
            },
          ],
        };
      }
    }

    if (name === 'check_agent_budget') {
      const res = await fetch(`${GUARDPAY_API_URL}/api/agents`);
      const agents: any[] = (await res.json()) as any[];
      const found = agents.find((a) => a.agentId === (args as any).agentId);

      if (!found) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Agent '${(args as any).agentId}' not registered with GuardPay.` }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                agentName: found.agentName,
                dailyLimit: `$${found.dailyBudgetLimit.toFixed(2)}`,
                currentSpentToday: `$${found.currentDailySpend.toFixed(2)}`,
                remainingDailyBudget: `$${(found.dailyBudgetLimit - found.currentDailySpend).toFixed(2)}`,
                maxPerTransaction: `$${found.maxPerTransaction.toFixed(2)}`,
                walletStatus: found.isFrozen ? 'FROZEN' : 'ACTIVE',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'agent_to_agent_payout') {
      const res = await fetch(`${GUARDPAY_API_URL}/api/spend/a2a-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const data: any = await res.json();

      if (data.success) {
        return {
          content: [
            {
              type: 'text',
              text: `SUCCESS: A2A Payout of $${(args as any).amount} sent to ${(args as any).toAgentEmail} via PayPal Payouts.\nBatch ID: ${data.payoutBatchId}`,
            },
          ],
        };
      } else {
        return {
          isError: true,
          content: [{ type: 'text', text: `A2A Payout Failed: ${data.reason}` }],
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool error: ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[PayPal Agent MCP Server] Running on stdio transport');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
