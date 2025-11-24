/**
 * Base Validator Interface
 * All validation strategies extend this base
 */

import { ValidationResult, ValidationCriteria } from '../types/validation.js';

export abstract class BaseValidator<T extends ValidationCriteria> {
  constructor(protected criteria: T) {}

  /**
   * Validate the output/value against criteria
   * @param output - Raw output from verification command
   * @param value - Extracted value for validation
   * @returns Validation result with pass/fail status and message
   */
  abstract validate(output: string, value?: number | string): ValidationResult;

  /**
   * Generate feedback message for failed validation
   * @param result - Validation result
   * @returns Actionable feedback message
   */
  abstract generateFeedback(result: ValidationResult): string;

  /**
   * Helper to create validation result
   */
  protected createResult(
    passed: boolean,
    message: string,
    actualValue?: number | string,
    expectedValue?: number | string
  ): ValidationResult {
    return {
      passed,
      actualValue,
      expectedValue,
      message,
      timestamp: new Date()
    };
  }
}
