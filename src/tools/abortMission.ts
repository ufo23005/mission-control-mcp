/**
 * Abort Mission Tool
 * MCP tool for aborting a running mission
 */

import { StateManager } from '../state/StateManager.js';
import { MissionState } from '../types/mission.js';
import { logger } from '../utils/logger.js';

export interface AbortMissionInput {
  missionId: string;
  reason?: string;
}

export class AbortMissionTool {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async execute(input: AbortMissionInput): Promise<string> {
    try {
      const mission = this.stateManager.getMission(input.missionId);

      // Check if mission can be aborted
      if (mission.state === MissionState.COMPLETED || mission.state === MissionState.FAILED) {
        return JSON.stringify({
          success: false,
          error: `Cannot abort mission in ${mission.state} state`
        }, null, 2);
      }

      // Abort mission
      mission.state = MissionState.ABORTED;
      mission.completedAt = new Date();
      mission.success = false;
      mission.errorMessage = input.reason || 'Manually aborted';

      this.stateManager.updateMission(mission);

      logger.info(`Mission aborted: ${mission.config.id}. Reason: ${mission.errorMessage}`);

      return JSON.stringify({
        success: true,
        message: `Mission ${mission.config.id} has been aborted`,
        attemptsUsed: mission.currentAttempt,
        reason: mission.errorMessage
      }, null, 2);

    } catch (error) {
      logger.error('Failed to abort mission:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2);
    }
  }
}
