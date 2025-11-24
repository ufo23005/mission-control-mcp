/**
 * Keyword Validator
 * Handles KEYWORD validation strategy
 * Based on section 2.3.A of the architecture document
 */

import { BaseValidator } from './BaseValidator.js';
import { KeywordCriteria, ValidationResult } from '../types/validation.js';

export class KeywordValidator extends BaseValidator<KeywordCriteria> {
  validate(output: string, _value?: number | string): ValidationResult {
    const caseSensitive = this.criteria.caseSensitive ?? true;
    const searchText = caseSensitive ? output : output.toLowerCase();
    const searchKeyword = caseSensitive ? this.criteria.keyword : this.criteria.keyword.toLowerCase();

    const contains = searchText.includes(searchKeyword);
    const passed = this.criteria.mustContain ? contains : !contains;

    let message: string;
    if (passed) {
      message = this.criteria.mustContain
        ? `Output contains required keyword: "${this.criteria.keyword}"`
        : `Output correctly excludes keyword: "${this.criteria.keyword}"`;
    } else {
      message = this.criteria.mustContain
        ? `Output missing required keyword: "${this.criteria.keyword}"`
        : `Output unexpectedly contains keyword: "${this.criteria.keyword}"`;
    }

    return this.createResult(passed, message, contains ? 'found' : 'not found', this.criteria.keyword);
  }

  generateFeedback(result: ValidationResult): string {
    if (result.passed) {
      return `Keyword validation succeeded.`;
    }

    if (this.criteria.mustContain) {
      return `Output does not contain the required keyword "${this.criteria.keyword}". ` +
        `Please verify the process completed successfully and check execution logs.`;
    } else {
      return `Output contains the forbidden keyword "${this.criteria.keyword}". ` +
        `This indicates an error or unexpected behavior. Please review the output.`;
    }
  }
}
