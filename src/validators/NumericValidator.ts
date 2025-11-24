/**
 * Numeric Validator
 * Handles NUMERIC validation strategy
 * Based on section 2.3.A of the architecture document
 */

import { BaseValidator } from './BaseValidator.js';
import {
  NumericCriteria,
  NumericOperator,
  ValidationResult
} from '../types/validation.js';
import { ValidationError } from '../utils/errors.js';

export class NumericValidator extends BaseValidator<NumericCriteria> {
  validate(output: string, value?: number | string): ValidationResult {
    // Extract numeric value
    const actualValue = typeof value === 'number' ? value : this.extractNumber(output);

    if (actualValue === null) {
      return this.createResult(
        false,
        'Failed to extract numeric value from output',
        undefined,
        this.criteria.threshold
      );
    }

    // Perform comparison based on operator
    const passed = this.compare(actualValue, this.criteria.operator, this.criteria.threshold);

    const message = passed
      ? `Validation passed: ${actualValue} ${this.criteria.operator} ${this.criteria.threshold}`
      : `Validation failed: ${actualValue} ${this.negateOperator(this.criteria.operator)} ${this.criteria.threshold}`;

    return this.createResult(passed, message, actualValue, this.criteria.threshold);
  }

  generateFeedback(result: ValidationResult): string {
    if (result.passed) {
      return `Goal achieved! ${this.criteria.metricName || 'Value'}: ${result.actualValue}`;
    }

    const diff = Math.abs((result.actualValue as number) - this.criteria.threshold);
    return `Target: ${this.criteria.metricName || 'Value'} ${this.criteria.operator} ${
      this.criteria.threshold
    }. Current: ${result.actualValue}. Gap: ${diff.toFixed(2)}. ` +
      `Suggestion: Review parameters affecting this metric.`;
  }

  /**
   * Extract first number from string
   */
  private extractNumber(text: string): number | null {
    const match = text.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Compare two numbers using operator
   */
  private compare(actual: number, operator: NumericOperator, threshold: number): boolean {
    switch (operator) {
      case NumericOperator.GREATER_THAN:
        return actual > threshold;
      case NumericOperator.LESS_THAN:
        return actual < threshold;
      case NumericOperator.GREATER_EQUAL:
        return actual >= threshold;
      case NumericOperator.LESS_EQUAL:
        return actual <= threshold;
      case NumericOperator.EQUAL:
        return Math.abs(actual - threshold) < 0.0001; // Float comparison
      case NumericOperator.NOT_EQUAL:
        return Math.abs(actual - threshold) >= 0.0001;
      default:
        throw new ValidationError(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Get negated operator for error messages
   */
  private negateOperator(operator: NumericOperator): string {
    const negations: Record<NumericOperator, string> = {
      [NumericOperator.GREATER_THAN]: '<=',
      [NumericOperator.LESS_THAN]: '>=',
      [NumericOperator.GREATER_EQUAL]: '<',
      [NumericOperator.LESS_EQUAL]: '>',
      [NumericOperator.EQUAL]: '!=',
      [NumericOperator.NOT_EQUAL]: '=='
    };
    return negations[operator];
  }
}
