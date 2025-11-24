/**
 * Dynamic Feedback Engine
 * Generates actionable feedback based on validation results
 * Based on section 2.3.C of the architecture document
 */

import { ValidationResult, AnyCriteria, ValidationStrategy } from '../types/validation.js';
import { NumericValidator } from '../validators/NumericValidator.js';
import { ExitCodeValidator } from '../validators/ExitCodeValidator.js';
import { KeywordValidator } from '../validators/KeywordValidator.js';
import { BaseValidator } from '../validators/BaseValidator.js';

export class FeedbackEngine {
  /**
   * Generate detailed feedback message based on validation result
   * @param criteria - Validation criteria used
   * @param result - Validation result
   * @param attemptNumber - Current attempt number
   * @returns Detailed, actionable feedback message
   */
  generateFeedback(
    criteria: AnyCriteria,
    result: ValidationResult,
    attemptNumber: number
  ): string {
    const validator = this.getValidator(criteria);
    const specificFeedback = validator.generateFeedback(result);

    if (result.passed) {
      return `✓ Attempt ${attemptNumber} succeeded!\n${specificFeedback}`;
    }

    return (
      `✗ Attempt ${attemptNumber} failed.\n` +
      `${specificFeedback}\n` +
      `\nPlease review and make necessary adjustments before the next attempt.`
    );
  }

  /**
   * Generate progress summary
   */
  generateProgressSummary(
    currentAttempt: number,
    maxAttempts: number,
    recentResults: ValidationResult[]
  ): string {
    const attemptsRemaining = maxAttempts - currentAttempt;
    const progressPct = ((currentAttempt / maxAttempts) * 100).toFixed(1);

    let summary = `Progress: Attempt ${currentAttempt}/${maxAttempts} (${progressPct}%)`;

    if (attemptsRemaining <= 3) {
      summary += `\n⚠️  Warning: Only ${attemptsRemaining} attempts remaining!`;
    }

    // Detect repeated failures
    if (recentResults.length >= 3) {
      const allSimilar = this.detectRepeatedPattern(recentResults.slice(-3));
      if (allSimilar) {
        summary += `\n⚠️  Detected repeated failure pattern. Consider changing approach.`;
      }
    }

    return summary;
  }

  /**
   * Detect if recent results show the same pattern
   */
  private detectRepeatedPattern(results: ValidationResult[]): boolean {
    if (results.length < 2) return false;

    const firstMsg = results[0].message;
    return results.every(r => r.message === firstMsg);
  }

  /**
   * Get appropriate validator for criteria
   */
  private getValidator(criteria: AnyCriteria): BaseValidator<AnyCriteria> {
    switch (criteria.strategy) {
      case ValidationStrategy.NUMERIC:
        return new NumericValidator(criteria);
      case ValidationStrategy.EXIT_CODE:
        return new ExitCodeValidator(criteria);
      case ValidationStrategy.KEYWORD:
        return new KeywordValidator(criteria);
      default:
        throw new Error(`Unknown validation strategy: ${(criteria as AnyCriteria).strategy}`);
    }
  }
}
