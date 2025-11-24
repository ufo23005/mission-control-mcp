/**
 * State Management Types
 * Based on section 3.2 of the architecture document
 */

import { Mission } from './mission.js';
import { LogLevel } from '../utils/logger.js';

/**
 * Checkpoint data for recovery
 */
export interface Checkpoint {
  /** Checkpoint ID */
  id: string;
  /** Mission ID */
  missionId: string;
  /** Checkpoint timestamp */
  timestamp: Date;
  /** Mission state at checkpoint */
  missionSnapshot: Mission;
  /** Attempt number at checkpoint */
  attemptNumber: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * System state configuration
 */
export interface StateConfig {
  /** Directory for state persistence */
  stateDir: string;
  /** Enable state persistence */
  enablePersistence: boolean;
  /** Logging level (default: INFO) */
  logLevel?: LogLevel;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Maximum checkpoints to keep */
  maxCheckpoints?: number;
  /** Retention policy for completed missions (days) */
  completedRetentionDays: number;
  /** Retention policy for failed missions (days) */
  failedRetentionDays: number;
}

/**
 * Global orchestrator state
 */
export interface OrchestratorState {
  /** All active missions */
  missions: Map<string, Mission>;
  /** All checkpoints */
  checkpoints: Map<string, Checkpoint>;
  /** Configuration */
  config: StateConfig;
  /** Last save timestamp */
  lastSaved?: Date;
}

/**
 * Serialized attempt for persistence (JSON-compatible)
 */
export interface SerializedAttempt {
  attemptNumber: number;
  timestamp: string; // ISO 8601
  output: string;
  value?: number | string;
  validationResult: {
    passed: boolean;
    message: string;
    actualValue?: number | string;
    expectedValue?: number | string;
    timestamp: string; // ISO 8601
  };
  duration?: number;
}

/**
 * Serialized mission for persistence (JSON-compatible)
 */
export interface SerializedMission {
  config: Mission['config'];
  state: Mission['state'];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  attempts: SerializedAttempt[];
  currentAttempt: number;
  completedAt?: string; // ISO 8601
  success?: boolean;
  errorMessage?: string;
}

/**
 * Serialized checkpoint for persistence (JSON-compatible)
 */
export interface SerializedCheckpoint {
  id: string;
  missionId: string;
  timestamp: string; // ISO 8601
  missionSnapshot: SerializedMission;
  attemptNumber: number;
  metadata?: Record<string, unknown>;
}

/**
 * Serialized state for persistence (JSON-compatible)
 *
 * This format is designed for safe JSON serialization:
 * - All Date objects converted to ISO 8601 strings
 * - All Map objects converted to arrays of [key, value] tuples
 * - Version field for future migration support
 */
export interface SerializedState {
  /** Format version for migration support */
  version: string;
  /** When this state was serialized */
  timestamp: string; // ISO 8601
  /** All missions as array of entries */
  missions: Array<[string, SerializedMission]>;
  /** All checkpoints as array of entries */
  checkpoints: Array<[string, SerializedCheckpoint]>;
}

/**
 * Current state format version
 * Increment when making breaking changes to serialization format
 */
export const STATE_VERSION = '1.0.0';

/**
 * Persistence performance metrics
 */
export interface PersistenceMetrics {
  /** Duration of last save operation (milliseconds) */
  lastSaveDuration?: number;
  /** Duration of last load operation (milliseconds) */
  lastLoadDuration?: number;
  /** Duration of last serialization (milliseconds) */
  lastSerializationTime?: number;
  /** Duration of last deserialization (milliseconds) */
  lastDeserializationTime?: number;
  /** Size of state file in bytes */
  stateFileSize?: number;
  /** Total number of save operations */
  totalSaves: number;
  /** Total number of load operations */
  totalLoads: number;
  /** Average save duration (milliseconds) */
  averageSaveDuration?: number;
  /** Average load duration (milliseconds) */
  averageLoadDuration?: number;
}
