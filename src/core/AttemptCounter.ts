/**
 * Attempt Counter
 * Prevents infinite loops and manages retry limits
 * Based on section 2.3.B of the architecture document
 */

import { MaxAttemptsExceededError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface AttemptCounterConfig {
  maxAttempts: number;
  warnThreshold?: number; // Warn when attempts remaining falls below this
}

export class AttemptCounter {
  private currentAttempt: number = 0;
  private config: Required<AttemptCounterConfig>;

  constructor(config: AttemptCounterConfig) {
    this.config = {
      maxAttempts: config.maxAttempts,
      warnThreshold: config.warnThreshold ?? 3
    };
  }

  /**
   * Create an AttemptCounter from existing attempt count
   *
   * This factory method is used when restoring mission state from persistence
   * or continuing an existing mission. It directly sets the current attempt
   * without triggering warning logs for historical attempts.
   *
   * This eliminates the O(n) replay loop and prevents redundant warning logs
   * that would occur if increment() was called repeatedly to reach the current state.
   *
   * @param currentAttempt - Number of attempts already made (0-based)
   * @param config - Counter configuration
   * @throws Error if currentAttempt is negative
   * @throws MaxAttemptsExceededError if currentAttempt exceeds maxAttempts
   * @returns AttemptCounter instance at the specified attempt number
   *
   * @example
   * ```typescript
   * // Restore a mission that's already at attempt 8
   * const counter = AttemptCounter.fromCurrentAttempt(8, { maxAttempts: 10 });
   * // Next increment will be attempt 9 (and will warn if configured)
   * counter.increment(); // Returns 9, may trigger warning
   * ```
   */
  static fromCurrentAttempt(
    currentAttempt: number,
    config: AttemptCounterConfig
  ): AttemptCounter {
    // Validate currentAttempt
    if (currentAttempt < 0) {
      throw new Error(`currentAttempt cannot be negative, got ${currentAttempt}`);
    }

    const normalizedConfig: Required<AttemptCounterConfig> = {
      maxAttempts: config.maxAttempts,
      warnThreshold: config.warnThreshold ?? 3
    };

    if (currentAttempt > normalizedConfig.maxAttempts) {
      throw new MaxAttemptsExceededError('mission', normalizedConfig.maxAttempts);
    }

    // Create instance using private constructor bypass
    const instance = new AttemptCounter(config);
    instance.currentAttempt = currentAttempt;

    return instance;
  }

  /**
   * Increment attempt counter
   * @throws MaxAttemptsExceededError if max attempts reached
   * @returns Current attempt number
   */
  increment(): number {
    this.currentAttempt++;

    if (this.currentAttempt > this.config.maxAttempts) {
      throw new MaxAttemptsExceededError('mission', this.config.maxAttempts);
    }

    const remaining = this.getRemainingAttempts();
    if (remaining <= this.config.warnThreshold && remaining > 0) {
      logger.warn(`Approaching attempt limit: ${remaining} attempts remaining`);
    }

    return this.currentAttempt;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.config.maxAttempts - this.currentAttempt);
  }

  /**
   * Check if more attempts are available
   */
  hasAttemptsRemaining(): boolean {
    return this.currentAttempt < this.config.maxAttempts;
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    return (this.currentAttempt / this.config.maxAttempts) * 100;
  }

  /**
   * Reset counter
   */
  reset(): void {
    this.currentAttempt = 0;
  }

  /**
   * Check if warning threshold reached
   */
  isNearingLimit(): boolean {
    return this.getRemainingAttempts() <= this.config.warnThreshold;
  }
}
