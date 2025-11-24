#!/usr/bin/env node

/**
 * Mission Control MCP Server
 * Main entry point for the automation orchestration system
 * Based on the architecture document: 通用自動化架構設計_完整版.md
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { StateManager } from './state/StateManager.js';
import { DefineMissionTool, DefineMissionInput } from './tools/defineMission.js';
import { SubmitAttemptTool, SubmitAttemptInput } from './tools/submitAttempt.js';
import { GetMissionStatusTool, GetMissionStatusInput } from './tools/getMissionStatus.js';
import { AbortMissionTool, AbortMissionInput } from './tools/abortMission.js';
import { logger, LogLevel } from './utils/logger.js';
import { StateConfig } from './types/state.js';

/**
 * Main server class
 */
class UniversalOrchestratorServer {
  private server: Server;
  private stateManager: StateManager;
  private defineMissionTool: DefineMissionTool;
  private submitAttemptTool: SubmitAttemptTool;
  private getMissionStatusTool: GetMissionStatusTool;
  private abortMissionTool: AbortMissionTool;

  /**
   * Private constructor - use UniversalOrchestratorServer.create() instead
   * @private
   */
  private constructor(stateManager: StateManager) {
    this.stateManager = stateManager;

    // Initialize tools
    this.defineMissionTool = new DefineMissionTool(this.stateManager);
    this.submitAttemptTool = new SubmitAttemptTool(this.stateManager);
    this.getMissionStatusTool = new GetMissionStatusTool(this.stateManager);
    this.abortMissionTool = new AbortMissionTool(this.stateManager);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'mission-control',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    logger.setLevel(LogLevel.INFO);
    logger.info('Mission Control MCP Server initialized');
  }

  /**
   * Create and initialize UniversalOrchestratorServer
   * @returns Fully initialized server instance
   */
  static async create(): Promise<UniversalOrchestratorServer> {
    // Initialize state manager with async factory method
    const stateConfig: StateConfig = {
      stateDir: process.env.MCP_STATE_DIR || './.state',
      enablePersistence: process.env.MCP_ENABLE_PERSISTENCE !== 'false',
      completedRetentionDays: parseInt(process.env.MCP_COMPLETED_RETENTION_DAYS || '30', 10),
      failedRetentionDays: parseInt(process.env.MCP_FAILED_RETENTION_DAYS || '90', 10),
      logLevel: process.env.MCP_LOG_LEVEL ? parseInt(process.env.MCP_LOG_LEVEL, 10) : undefined
    };

    const stateManager = await StateManager.create(stateConfig);
    return new UniversalOrchestratorServer(stateManager);
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'define_mission',
          description: 'Define a new automation mission with validation criteria. ' +
            'This locks in the goal, verification strategy, and success conditions.',
          inputSchema: {
            type: 'object',
            properties: {
              goal: {
                type: 'string',
                description: 'Natural language description of the mission goal'
              },
              strategy: {
                type: 'string',
                enum: ['NUMERIC', 'EXIT_CODE', 'KEYWORD'],
                description: 'Validation strategy: NUMERIC (number comparison), ' +
                  'EXIT_CODE (command exit status), or KEYWORD (text matching)'
              },
              criteria: {
                type: 'object',
                description: 'Strategy-specific criteria. For NUMERIC: {operator, threshold, metricName}. ' +
                  'For EXIT_CODE: {expectedCode, command}. For KEYWORD: {keyword, mustContain, caseSensitive}'
              },
              maxAttempts: {
                type: 'number',
                description: 'Maximum number of attempts allowed (default: 10)'
              },
              enableCheckpoints: {
                type: 'boolean',
                description: 'Enable checkpoint mechanism for recovery (default: false)'
              },
              checkpointFrequency: {
                type: 'number',
                description: 'Create checkpoint every N attempts (default: 5)'
              }
            },
            required: ['goal', 'strategy', 'criteria']
          }
        },
        {
          name: 'submit_attempt',
          description: 'Submit a verification attempt for validation. ' +
            'The system will check if the output/value meets the success criteria.',
          inputSchema: {
            type: 'object',
            properties: {
              missionId: {
                type: 'string',
                description: 'ID of the mission (from define_mission response)'
              },
              output: {
                type: 'string',
                description: 'Raw output from the verification command/process'
              },
              value: {
                type: ['number', 'string'],
                description: 'Extracted value for validation (optional if already in output)'
              }
            },
            required: ['missionId', 'output']
          }
        },
        {
          name: 'get_mission_status',
          description: 'Query the current status of a mission, including attempt history and progress.',
          inputSchema: {
            type: 'object',
            properties: {
              missionId: {
                type: 'string',
                description: 'ID of the mission to query'
              }
            },
            required: ['missionId']
          }
        },
        {
          name: 'abort_mission',
          description: 'Abort a running mission manually.',
          inputSchema: {
            type: 'object',
            properties: {
              missionId: {
                type: 'string',
                description: 'ID of the mission to abort'
              },
              reason: {
                type: 'string',
                description: 'Optional reason for aborting'
              }
            },
            required: ['missionId']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        logger.info(`Tool called: ${name}`);

        let result: string;

        switch (name) {
          case 'define_mission':
            result = await this.defineMissionTool.execute(args as unknown as DefineMissionInput);
            break;

          case 'submit_attempt':
            result = await this.submitAttemptTool.execute(args as unknown as SubmitAttemptInput);
            break;

          case 'get_mission_status':
            result = await this.getMissionStatusTool.execute(args as unknown as GetMissionStatusInput);
            break;

          case 'abort_mission':
            result = await this.abortMissionTool.execute(args as unknown as AbortMissionInput);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        };

      } catch (error) {
        logger.error('Tool execution error:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Mission Control MCP Server running on stdio');
  }
}

// Start server
async function main() {
  try {
    const server = await UniversalOrchestratorServer.create();
    await server.run();
  } catch (error) {
    logger.critical('Server error:', error);
    process.exit(1);
  }
}

main();
