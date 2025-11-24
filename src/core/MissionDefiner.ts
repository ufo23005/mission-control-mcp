/**
 * Mission Definer
 * Accepts and locks mission parameters
 * Based on section 2.3.A of the architecture document
 */

import { v4 as uuidv4 } from 'uuid';
import { Mission, MissionConfig, MissionState } from '../types/mission.js';
import { AnyCriteria } from '../types/validation.js';
import { InvalidCriteriaError } from '../utils/errors.js';

export interface DefineMissionParams {
  goal: string;
  criteria: AnyCriteria;
  maxAttempts?: number;
  enableCheckpoints?: boolean;
  checkpointFrequency?: number;
  attemptTimeout?: number;
}

export class MissionDefiner {
  /**
   * Define a new mission with validation criteria
   * @param params - Mission parameters
   * @returns Configured mission
   */
  defineMission(params: DefineMissionParams): Mission {
    // Validate criteria
    this.validateCriteria(params.criteria);

    // Create mission config
    const config: MissionConfig = {
      id: uuidv4(),
      goal: params.goal,
      criteria: params.criteria,
      maxAttempts: params.maxAttempts ?? 10,
      enableCheckpoints: params.enableCheckpoints ?? false,
      checkpointFrequency: params.checkpointFrequency ?? 5,
      attemptTimeout: params.attemptTimeout
    };

    // Create mission
    const mission: Mission = {
      config,
      state: MissionState.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: [],
      currentAttempt: 0
    };

    return mission;
  }

  /**
   * Validate criteria configuration
   */
  private validateCriteria(criteria: AnyCriteria): void {
    if (!criteria.strategy) {
      throw new InvalidCriteriaError('Strategy must be specified');
    }

    switch (criteria.strategy) {
      case 'NUMERIC':
        if (typeof criteria.threshold !== 'number') {
          throw new InvalidCriteriaError('NUMERIC strategy requires threshold (number)');
        }
        if (!criteria.operator) {
          throw new InvalidCriteriaError('NUMERIC strategy requires operator');
        }
        break;

      case 'EXIT_CODE':
        if (typeof criteria.expectedCode !== 'number') {
          throw new InvalidCriteriaError('EXIT_CODE strategy requires expectedCode (number)');
        }
        break;

      case 'KEYWORD':
        if (typeof criteria.keyword !== 'string' || criteria.keyword.length === 0) {
          throw new InvalidCriteriaError('KEYWORD strategy requires non-empty keyword (string)');
        }
        if (typeof criteria.mustContain !== 'boolean') {
          throw new InvalidCriteriaError('KEYWORD strategy requires mustContain (boolean)');
        }
        break;

      default:
        throw new InvalidCriteriaError(`Unknown strategy: ${(criteria as AnyCriteria).strategy}`);
    }
  }
}
