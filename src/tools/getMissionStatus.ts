/**
 * Get Mission Status Tool
 * MCP tool for querying mission status
 */

import { StateManager } from '../state/StateManager.js';
import { MissionStatus } from '../types/mission.js';
import { logger } from '../utils/logger.js';

export interface GetMissionStatusInput {
  missionId: string;
}

export class GetMissionStatusTool {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async execute(input: GetMissionStatusInput): Promise<string> {
    try {
      const mission = this.stateManager.getMission(input.missionId);

      const maxAttempts = mission.config.maxAttempts ?? 10;

      const status: MissionStatus = {
        id: mission.config.id,
        state: mission.state,
        goal: mission.config.goal,
        currentAttempt: mission.currentAttempt,
        maxAttempts,
        attemptsRemaining: maxAttempts - mission.currentAttempt,
        progressPercentage: (mission.currentAttempt / maxAttempts) * 100,
        lastAttemptResult: mission.attempts.length > 0
          ? mission.attempts[mission.attempts.length - 1].validationResult
          : undefined,
        success: mission.success
      };

      return JSON.stringify({
        success: true,
        status,
        attempts: mission.attempts.map(a => ({
          attemptNumber: a.attemptNumber,
          timestamp: a.timestamp,
          passed: a.validationResult.passed,
          message: a.validationResult.message
        }))
      }, null, 2);

    } catch (error) {
      logger.error('Failed to get mission status:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2);
    }
  }
}
