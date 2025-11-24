/**
 * Mission and Task State Types
 * Based on sections 2.1-2.3 of the architecture document
 */

import { AnyCriteria, ValidationResult } from './validation.js';

/**
 * Mission state enumeration
 */
export enum MissionState {
  /** Mission defined but not started */
  PENDING = 'PENDING',
  /** Mission in progress */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Mission completed successfully */
  COMPLETED = 'COMPLETED',
  /** Mission failed after max attempts */
  FAILED = 'FAILED',
  /** Mission manually aborted */
  ABORTED = 'ABORTED'
}

/**
 * Single attempt record
 */
export interface Attempt {
  /** Attempt number (1-indexed) */
  attemptNumber: number;
  /** Timestamp of attempt */
  timestamp: Date;
  /** Output from verification command */
  output: string;
  /** Extracted value for validation */
  value?: number | string;
  /** Validation result */
  validationResult: ValidationResult;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Mission configuration
 */
export interface MissionConfig {
  /** Unique mission identifier */
  id: string;
  /** Natural language goal description */
  goal: string;
  /** Validation criteria */
  criteria: AnyCriteria;
  /** Maximum allowed attempts (default: 10) */
  maxAttempts?: number;
  /** Enable checkpoint mechanism */
  enableCheckpoints?: boolean;
  /** Checkpoint frequency (every N attempts) */
  checkpointFrequency?: number;
  /** Timeout per attempt in milliseconds */
  attemptTimeout?: number;
}

/**
 * Complete mission state
 */
export interface Mission {
  /** Mission configuration */
  config: MissionConfig;
  /** Current state */
  state: MissionState;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** All attempts made */
  attempts: Attempt[];
  /** Current attempt count */
  currentAttempt: number;
  /** Completion timestamp */
  completedAt?: Date;
  /** Final success status */
  success?: boolean;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Mission status summary for reporting
 */
export interface MissionStatus {
  id: string;
  state: MissionState;
  goal: string;
  currentAttempt: number;
  maxAttempts: number;
  attemptsRemaining: number;
  lastAttemptResult?: ValidationResult;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
  success?: boolean;
}
