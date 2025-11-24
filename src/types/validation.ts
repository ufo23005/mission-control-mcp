/**
 * Validation Strategy Types for Mission Control
 * Based on section 2.3.A of the architecture document
 */

/**
 * Supported validation strategies
 */
export enum ValidationStrategy {
  /** Numeric comparison (>, <, >=, <=, ==, !=) */
  NUMERIC = 'NUMERIC',
  /** Exit code checking (typically 0 = success) */
  EXIT_CODE = 'EXIT_CODE',
  /** Keyword matching in output */
  KEYWORD = 'KEYWORD'
}

/**
 * Numeric comparison operators
 */
export enum NumericOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!='
}

/**
 * Base validation criteria interface
 */
export interface ValidationCriteria {
  strategy: ValidationStrategy;
}

/**
 * Numeric validation criteria
 * Example: sharpe_ratio >= 2.0
 */
export interface NumericCriteria extends ValidationCriteria {
  strategy: ValidationStrategy.NUMERIC;
  operator: NumericOperator;
  threshold: number;
  metricName?: string;
}

/**
 * Exit code validation criteria
 * Example: npm test returns 0
 */
export interface ExitCodeCriteria extends ValidationCriteria {
  strategy: ValidationStrategy.EXIT_CODE;
  expectedCode: number;
  command?: string;
}

/**
 * Keyword validation criteria
 * Example: output contains "All tests passed"
 */
export interface KeywordCriteria extends ValidationCriteria {
  strategy: ValidationStrategy.KEYWORD;
  keyword: string;
  mustContain: boolean;
  caseSensitive?: boolean;
}

/**
 * Union type for all validation criteria
 */
export type AnyCriteria = NumericCriteria | ExitCodeCriteria | KeywordCriteria;

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  actualValue?: number | string;
  expectedValue?: number | string;
  message: string;
  timestamp: Date;
}
