/**
 * Exit Code Validator
 * Handles EXIT_CODE validation strategy
 * Based on section 2.3.A of the architecture document
 */

import { BaseValidator } from './BaseValidator.js';
import { ExitCodeCriteria, ValidationResult } from '../types/validation.js';

export class ExitCodeValidator extends BaseValidator<ExitCodeCriteria> {
  validate(output: string, value?: number | string): ValidationResult {
    // Exit code should be passed as value
    const actualCode = typeof value === 'number' ? value : this.extractExitCode(output);

    if (actualCode === null) {
      return this.createResult(
        false,
        'Failed to extract exit code from output',
        undefined,
        this.criteria.expectedCode
      );
    }

    const passed = actualCode === this.criteria.expectedCode;

    const message = passed
      ? `Command succeeded with exit code ${actualCode}`
      : `Command failed with exit code ${actualCode} (expected ${this.criteria.expectedCode})`;

    return this.createResult(passed, message, actualCode, this.criteria.expectedCode);
  }

  generateFeedback(result: ValidationResult): string {
    if (result.passed) {
      return `Command executed successfully (exit code = ${result.actualValue}).`;
    }

    const command = this.criteria.command || 'command';
    return `Execution failed (exit code = ${result.actualValue}, expected ${result.expectedValue}). ` +
      `The ${command} returned an error. Please review error logs and fix the underlying issues.`;
  }

  /**
   * Extract exit code from output string
   * Looks for patterns like "exit code: 1" or "returned: 0"
   */
  private extractExitCode(text: string): number | null {
    // Try common patterns
    const patterns = [
      /exit\s*code[:\s]+(\d+)/i,
      /returned[:\s]+(\d+)/i,
      /status[:\s]+(\d+)/i,
      /^(\d+)$/  // Just a number
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }
}
