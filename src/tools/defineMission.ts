/**
 * Define Mission Tool
 * MCP tool for defining a new automation mission
 */

import { MissionDefiner, DefineMissionParams } from '../core/MissionDefiner.js';
import { AnyCriteria, ValidationStrategy, NumericOperator } from '../types/validation.js';
import { StateManager } from '../state/StateManager.js';
import { MissionState } from '../types/mission.js';
import { logger } from '../utils/logger.js';

export interface DefineMissionInput {
  goal: string;
  strategy: string;
  criteria: Record<string, unknown>;
  maxAttempts?: number;
  enableCheckpoints?: boolean;
  checkpointFrequency?: number;
}

export class DefineMissionTool {
  private definer: MissionDefiner;
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.definer = new MissionDefiner();
    this.stateManager = stateManager;
  }

  async execute(input: DefineMissionInput): Promise<string> {
    try {
      // Parse criteria based on strategy
      const criteria = this.parseCriteria(input.strategy, input.criteria);

      // Create mission
      const params: DefineMissionParams = {
        goal: input.goal,
        criteria,
        maxAttempts: input.maxAttempts,
        enableCheckpoints: input.enableCheckpoints,
        checkpointFrequency: input.checkpointFrequency
      };

      const mission = this.definer.defineMission(params);

      // Update state to IN_PROGRESS
      mission.state = MissionState.IN_PROGRESS;

      // Store mission
      this.stateManager.addMission(mission);

      logger.info(`Mission defined: ${mission.config.id}`);

      return JSON.stringify({
        success: true,
        missionId: mission.config.id,
        message: `Mission created successfully. ID: ${mission.config.id}`,
        config: {
          goal: mission.config.goal,
          strategy: criteria.strategy,
          maxAttempts: mission.config.maxAttempts
        }
      }, null, 2);
    } catch (error) {
      logger.error('Failed to define mission:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2);
    }
  }

  private parseCriteria(strategy: string, criteriaData: Record<string, unknown>): AnyCriteria {
    switch (strategy) {
      case 'NUMERIC':
        return {
          strategy: ValidationStrategy.NUMERIC,
          operator: criteriaData.operator as NumericOperator,
          threshold: criteriaData.threshold as number,
          metricName: criteriaData.metricName as string | undefined
        };

      case 'EXIT_CODE':
        return {
          strategy: ValidationStrategy.EXIT_CODE,
          expectedCode: (criteriaData.expectedCode ?? 0) as number,
          command: criteriaData.command as string | undefined
        };

      case 'KEYWORD':
        return {
          strategy: ValidationStrategy.KEYWORD,
          keyword: criteriaData.keyword as string,
          mustContain: (criteriaData.mustContain ?? true) as boolean,
          caseSensitive: (criteriaData.caseSensitive ?? true) as boolean
        };

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }
}
