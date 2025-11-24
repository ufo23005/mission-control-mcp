/**
 * Custom error types for the Mission Control
 * Based on section 3.1 of the architecture document
 */

/**
 * Base error class for orchestrator errors
 */
export class OrchestratorError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

/**
 * Mission not found error
 */
export class MissionNotFoundError extends OrchestratorError {
  constructor(
    missionId: string,
    context?: {
      availableMissions?: number;
      suggestion?: string;
    }
  ) {
    let message = `Mission not found: ${missionId}`;

    if (context) {
      if (context.availableMissions !== undefined) {
        message += `. Available missions: ${context.availableMissions}`;
      }
      if (context.suggestion) {
        message += `. ${context.suggestion}`;
      }
    }

    super(message, 'MISSION_NOT_FOUND');
    this.name = 'MissionNotFoundError';
  }
}

/**
 * Mission already exists error
 */
export class MissionExistsError extends OrchestratorError {
  constructor(
    missionId: string,
    context?: {
      existingState?: string;
      suggestion?: string;
    }
  ) {
    let message = `Mission already exists: ${missionId}`;

    if (context) {
      if (context.existingState) {
        message += `. Current state: ${context.existingState}`;
      }
      if (context.suggestion) {
        message += `. ${context.suggestion}`;
      }
    }

    super(message, 'MISSION_EXISTS');
    this.name = 'MissionExistsError';
  }
}

/**
 * Maximum attempts exceeded error
 */
export class MaxAttemptsExceededError extends OrchestratorError {
  constructor(missionId: string, maxAttempts: number) {
    super(
      `Mission ${missionId} exceeded maximum attempts (${maxAttempts})`,
      'MAX_ATTEMPTS_EXCEEDED'
    );
    this.name = 'MaxAttemptsExceededError';
  }
}

/**
 * Invalid validation criteria error
 */
export class InvalidCriteriaError extends OrchestratorError {
  constructor(reason: string) {
    super(`Invalid validation criteria: ${reason}`, 'INVALID_CRITERIA');
    this.name = 'InvalidCriteriaError';
  }
}

/**
 * State persistence error (base class for persistence-related errors)
 */
export class StatePersistenceError extends OrchestratorError {
  constructor(
    operation: string,
    reason: string,
    context?: {
      suggestion?: string;
    }
  ) {
    let message = `State persistence failed (${operation}): ${reason}`;

    if (context?.suggestion) {
      message += `. ${context.suggestion}`;
    }

    super(message, 'STATE_PERSISTENCE_ERROR');
    this.name = 'StatePersistenceError';
  }
}

/**
 * State corrupted error - unable to deserialize state file
 */
export class StateCorruptedError extends StatePersistenceError {
  constructor(
    filePath: string,
    reason: string,
    context?: {
      hasBackup?: boolean;
      recoverySteps?: string;
    }
  ) {
    let message = `Corrupted state file at ${filePath}: ${reason}`;

    if (context) {
      if (context.hasBackup) {
        message += `. Backup file available for recovery`;
      }
      if (context.recoverySteps) {
        message += `. ${context.recoverySteps}`;
      }
    }

    super('load', message);
    this.name = 'StateCorruptedError';
    this.code = 'STATE_CORRUPTED';
  }
}

/**
 * State directory error - issues with state storage directory
 */
export class StateDirectoryError extends StatePersistenceError {
  constructor(dirPath: string, reason: string, suggestion?: string) {
    super('directory', `State directory error at ${dirPath}: ${reason}`,
      suggestion ? { suggestion } : undefined);
    this.name = 'StateDirectoryError';
    this.code = 'STATE_DIRECTORY_ERROR';
  }
}

/**
 * State version error - incompatible state file version
 */
export class StateVersionError extends StatePersistenceError {
  constructor(currentVersion: string, fileVersion: string, migrationAvailable?: boolean) {
    const suggestion = migrationAvailable
      ? 'Migration available for this version'
      : 'Manual migration may be required';

    super('version', `Incompatible state version: file=${fileVersion}, current=${currentVersion}`,
      { suggestion });
    this.name = 'StateVersionError';
    this.code = 'STATE_VERSION_ERROR';
  }
}

/**
 * Validation error
 */
export class ValidationError extends OrchestratorError {
  constructor(reason: string) {
    super(`Validation failed: ${reason}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
