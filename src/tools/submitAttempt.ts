/**
 * Submit Attempt Tool
 * MCP tool for submitting verification results
 */

import { StateManager } from '../state/StateManager.js';
import { Attempt, MissionState } from '../types/mission.js';
import { ValidationStrategy, AnyCriteria } from '../types/validation.js';
import { NumericValidator } from '../validators/NumericValidator.js';
import { ExitCodeValidator } from '../validators/ExitCodeValidator.js';
import { KeywordValidator } from '../validators/KeywordValidator.js';
import { FeedbackEngine } from '../core/FeedbackEngine.js';
import { AttemptCounter } from '../core/AttemptCounter.js';
import { logger } from '../utils/logger.js';

export interface SubmitAttemptInput {
  missionId: string;
  output: string;
  value?: number | string;
}

export class SubmitAttemptTool {
  private stateManager: StateManager;
  private feedbackEngine: FeedbackEngine;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.feedbackEngine = new FeedbackEngine();
  }

  async execute(input: SubmitAttemptInput): Promise<string> {
    try {
      const mission = this.stateManager.getMission(input.missionId);

      // Check if mission is in valid state
      if (mission.state !== MissionState.IN_PROGRESS) {
        return JSON.stringify({
          success: false,
          error: `Mission is not in progress (current state: ${mission.state})`
        }, null, 2);
      }

      // Restore attempt counter from mission state
      // Using factory method to avoid redundant warning logs during replay
      const maxAttempts = mission.config.maxAttempts ?? 10;
      const attemptCounter = AttemptCounter.fromCurrentAttempt(
        mission.currentAttempt,
        { maxAttempts }
      );

      let attemptNumber: number;
      try {
        attemptNumber = attemptCounter.increment();
      } catch (error) {
        // Max attempts exceeded
        mission.state = MissionState.FAILED;
        mission.completedAt = new Date();
        mission.success = false;
        mission.errorMessage = 'Maximum attempts exceeded';
        this.stateManager.updateMission(mission);

        return JSON.stringify({
          success: false,
          passed: false,
          final: true,
          message: 'Mission failed: Maximum attempts exceeded',
          attemptsUsed: mission.currentAttempt,
          maxAttempts: mission.config.maxAttempts
        }, null, 2);
      }

      // Validate result
      const validator = this.getValidator(mission.config.criteria);
      const validationResult = validator.validate(input.output, input.value);

      // Truncate output for storage if too long (1MB)
      const MAX_OUTPUT_LENGTH = 1024 * 1024;
      const storedOutput = input.output.length > MAX_OUTPUT_LENGTH
        ? input.output.substring(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'
        : input.output;

      // Create attempt record
      const attempt: Attempt = {
        attemptNumber,
        timestamp: new Date(),
        output: storedOutput,
        value: input.value,
        validationResult
      };

      // Update mission
      mission.attempts.push(attempt);
      mission.currentAttempt = attemptNumber;
      mission.updatedAt = new Date();

      // Generate feedback
      const feedback = this.feedbackEngine.generateFeedback(
        mission.config.criteria,
        validationResult,
        attemptNumber
      );

      const progressSummary = this.feedbackEngine.generateProgressSummary(
        attemptNumber,
        maxAttempts,
        mission.attempts.map(a => a.validationResult)
      );

      // Check if validation passed
      if (validationResult.passed) {
        mission.state = MissionState.COMPLETED;
        mission.completedAt = new Date();
        mission.success = true;
        this.stateManager.updateMission(mission);

        return JSON.stringify({
          success: true,
          passed: true,
          final: true,
          message: `Mission completed successfully!`,
          feedback,
          attemptsUsed: attemptNumber,
          validationResult
        }, null, 2);
      }

      // Validation failed, continue
      this.stateManager.updateMission(mission);

      return JSON.stringify({
        success: true,
        passed: false,
        final: false,
        message: 'Attempt failed validation. Please try again.',
        feedback,
        progressSummary,
        attemptsRemaining: attemptCounter.getRemainingAttempts(),
        validationResult
      }, null, 2);

    } catch (error) {
      logger.error('Failed to submit attempt:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2);
    }
  }

  private getValidator(criteria: AnyCriteria) {
    switch (criteria.strategy) {
      case ValidationStrategy.NUMERIC:
        return new NumericValidator(criteria);
      case ValidationStrategy.EXIT_CODE:
        return new ExitCodeValidator(criteria);
      case ValidationStrategy.KEYWORD:
        return new KeywordValidator(criteria);
      default:
        // This should be unreachable if all cases are handled
        throw new Error(`Unknown strategy: ${JSON.stringify(criteria)}`);
    }
  }
}
