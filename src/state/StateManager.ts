/**
 * State Manager
 * Manages mission state and persistence
 * Based on section 3.2 of the architecture document
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Mission, MissionState, Attempt } from '../types/mission.js';
import {
  OrchestratorState,
  StateConfig,
  SerializedState,
  SerializedMission,
  SerializedAttempt,
  SerializedCheckpoint,
  Checkpoint,
  PersistenceMetrics,
  STATE_VERSION
} from '../types/state.js';
import {
  MissionNotFoundError,
  MissionExistsError,
  StateCorruptedError,
  StateDirectoryError,
  StatePersistenceError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class StateManager {
  private state: OrchestratorState;
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private readonly SAVE_DEBOUNCE_MS = 1000;
  private readonly STATE_FILE = 'state.json';
  private readonly STATE_BACKUP = 'state.json.bak';
  private readonly STATE_TEMP = 'state.json.tmp';
  private isShuttingDown: boolean = false;
  private metrics: PersistenceMetrics = {
    totalSaves: 0,
    totalLoads: 0
  };

  /**
   * Private constructor - use StateManager.create() instead
   *
   * This ensures the instance is fully initialized before use,
   * preventing race conditions with async persistence initialization.
   *
   * @private
   */
  private constructor(config: StateConfig) {
    this.state = {
      missions: new Map(),
      checkpoints: new Map(),
      config,
      lastSaved: undefined
    };
  }

  /**
   * Create and initialize a StateManager instance
   *
   * This is the recommended way to create a StateManager.
   * It ensures that persistence is fully initialized before
   * the instance is returned.
   *
   * @param config - State configuration
   * @returns Fully initialized StateManager instance
   *
   * @example
   * ```typescript
   * const stateManager = await StateManager.create({
   *   stateDir: './state',
   *   enablePersistence: true,
   *   completedRetentionDays: 30,
   *   failedRetentionDays: 90
   * });
   * ```
   */
  static async create(config: StateConfig): Promise<StateManager> {
    const instance = new StateManager(config);

    // Configure logger level if specified
    if (config.logLevel !== undefined) {
      logger.setLevel(config.logLevel);
    }

    // Initialize persistence if enabled
    if (config.enablePersistence) {
      await instance.initializePersistence();
    }

    return instance;
  }

  /**
   * Add a new mission
   */
  addMission(mission: Mission): void {
    if (this.state.missions.has(mission.config.id)) {
      throw new MissionExistsError(mission.config.id);
    }

    this.state.missions.set(mission.config.id, mission);
    logger.info(`Mission added: ${mission.config.id}`);
    this.debouncedSave();
  }

  /**
   * Get mission by ID
   */
  getMission(missionId: string): Mission {
    const mission = this.state.missions.get(missionId);
    if (!mission) {
      throw new MissionNotFoundError(missionId, {
        availableMissions: this.state.missions.size,
        suggestion: 'Use getAllMissions() or getMissionsByState() to list available missions'
      });
    }
    return mission;
  }

  /**
   * Update mission
   */
  updateMission(mission: Mission): void {
    if (!this.state.missions.has(mission.config.id)) {
      throw new MissionNotFoundError(mission.config.id, {
        availableMissions: this.state.missions.size,
        suggestion: 'Verify mission ID before updating'
      });
    }

    mission.updatedAt = new Date();
    this.state.missions.set(mission.config.id, mission);
    this.debouncedSave();
  }

  /**
   * Delete mission
   */
  deleteMission(missionId: string): void {
    if (!this.state.missions.delete(missionId)) {
      throw new MissionNotFoundError(missionId, {
        availableMissions: this.state.missions.size,
        suggestion: 'Mission may have been already deleted'
      });
    }
    logger.info(`Mission deleted: ${missionId}`);
    this.debouncedSave();
  }

  /**
   * Get all missions
   */
  getAllMissions(): Mission[] {
    return Array.from(this.state.missions.values());
  }

  /**
   * Get missions by state
   */
  getMissionsByState(state: MissionState): Mission[] {
    return this.getAllMissions().filter(m => m.state === state);
  }

  /**
   * Get active missions count
   */
  getActiveMissionsCount(): number {
    return this.getMissionsByState(MissionState.IN_PROGRESS).length;
  }

  /**
   * Clean up old missions based on retention policy
   */
  cleanupOldMissions(): number {
    const now = new Date();
    let deleted = 0;

    for (const mission of this.state.missions.values()) {
      let shouldDelete = false;

      if (mission.state === MissionState.COMPLETED && mission.completedAt) {
        const daysOld = (now.getTime() - mission.completedAt.getTime()) / (1000 * 60 * 60 * 24);
        shouldDelete = daysOld > this.state.config.completedRetentionDays;
      } else if (mission.state === MissionState.FAILED && mission.completedAt) {
        const daysOld = (now.getTime() - mission.completedAt.getTime()) / (1000 * 60 * 60 * 24);
        shouldDelete = daysOld > this.state.config.failedRetentionDays;
      }

      if (shouldDelete) {
        this.deleteMission(mission.config.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} old missions`);
    }

    return deleted;
  }

  /**
   * Get orchestrator state
   */
  getState(): OrchestratorState {
    return this.state;
  }

  /**
   * Get persistence performance metrics
   */
  getMetrics(): PersistenceMetrics {
    return {
      totalSaves: this.metrics.totalSaves,
      totalLoads: this.metrics.totalLoads,
      lastSaveDuration: this.metrics.lastSaveDuration,
      lastLoadDuration: this.metrics.lastLoadDuration,
      lastSerializationTime: this.metrics.lastSerializationTime,
      lastDeserializationTime: this.metrics.lastDeserializationTime,
      stateFileSize: this.metrics.stateFileSize,
      averageSaveDuration: this.metrics.averageSaveDuration,
      averageLoadDuration: this.metrics.averageLoadDuration
    };
  }

  // ============================================================================
  // Persistence Methods
  // ============================================================================

  /**
   * Initialize persistence layer
   * - Load existing state if available
   * - Setup shutdown handlers
   */
  private async initializePersistence(): Promise<void> {
    try {
      await this.ensureStateDirectory();
      await this.loadState();
      this.setupShutdownHandlers();
      logger.info('Persistence layer initialized', {
        stateDir: this.state.config.stateDir,
        missionsLoaded: this.state.missions.size
      });
    } catch (error) {
      logger.error('Failed to initialize persistence', error);
      // Continue without persistence rather than failing completely
      logger.warn('Running in memory-only mode');
    }
  }

  /**
   * Ensure state directory exists with proper permissions
   */
  private async ensureStateDirectory(): Promise<void> {
    const { stateDir } = this.state.config;

    try {
      await fs.mkdir(stateDir, { recursive: true, mode: 0o750 });
    } catch (error) {
      throw new StateDirectoryError(
        stateDir,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Setup process shutdown handlers for graceful state saving
   */
  private setupShutdownHandlers(): void {
    const cleanup = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (this.isDirty) {
        logger.info('Saving state before shutdown...');
        try {
          await this.saveStateSync();
          logger.info('State saved successfully');
        } catch (error) {
          logger.error('Failed to save state during shutdown', error);
        }
      }
    };

    // Handle different termination signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  /**
   * Trigger debounced save
   * Resets timer on each call, only saves after inactivity period
   */
  private debouncedSave(): void {
    if (!this.state.config.enablePersistence || this.isShuttingDown) {
      return;
    }

    this.isDirty = true;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveState().catch(error => {
        logger.error('Debounced save failed', error);
      });
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Save current state to disk (async, atomic write)
   */
  private async saveState(): Promise<void> {
    const startTime = performance.now();
    const { stateDir } = this.state.config;
    const stateFile = path.join(stateDir, this.STATE_FILE);
    const tempFile = path.join(stateDir, this.STATE_TEMP);
    const backupFile = path.join(stateDir, this.STATE_BACKUP);

    try {
      // Serialize state
      const serialized = this.serializeState();
      const json = JSON.stringify(serialized, null, 2);

      // Atomic write pattern:
      // 1. Write to temp file
      await fs.writeFile(tempFile, json, { encoding: 'utf8', mode: 0o640 });

      // 2. If current state exists, backup it
      try {
        await fs.access(stateFile);
        await fs.copyFile(stateFile, backupFile);
      } catch {
        // No existing state file, first save
      }

      // 3. Atomically rename temp to final (atomic on POSIX)
      await fs.rename(tempFile, stateFile);

      // Update metadata
      this.state.lastSaved = new Date();
      this.isDirty = false;

      // Collect performance metrics
      const saveDuration = performance.now() - startTime;
      this.metrics.lastSaveDuration = saveDuration;
      this.metrics.totalSaves++;

      // Calculate average save duration
      if (this.metrics.averageSaveDuration === undefined) {
        this.metrics.averageSaveDuration = saveDuration;
      } else {
        this.metrics.averageSaveDuration =
          (this.metrics.averageSaveDuration * (this.metrics.totalSaves - 1) + saveDuration) /
          this.metrics.totalSaves;
      }

      // Get file size
      try {
        const stats = await fs.stat(stateFile);
        this.metrics.stateFileSize = stats.size;
      } catch {
        // Ignore if unable to get file size
      }

      logger.debug('State saved successfully', {
        missions: this.state.missions.size,
        checkpoints: this.state.checkpoints.size
      });
    } catch (error) {
      throw new StatePersistenceError(
        'save',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Synchronous save for shutdown (blocking)
   */
  private async saveStateSync(): Promise<void> {
    // Clear any pending debounced save
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await this.saveState();
  }

  /**
   * Load state from disk with recovery fallback
   */
  private async loadState(): Promise<void> {
    const startTime = performance.now();
    const { stateDir } = this.state.config;
    const stateFile = path.join(stateDir, this.STATE_FILE);
    const backupFile = path.join(stateDir, this.STATE_BACKUP);

    // Try loading main state file
    let serialized = await this.tryLoadStateFile(stateFile);

    // If failed, try backup
    if (!serialized) {
      logger.warn('Primary state file corrupted, trying backup...');
      serialized = await this.tryLoadStateFile(backupFile);

      if (serialized) {
        logger.info('Successfully recovered from backup');
      } else {
        logger.warn('No valid state found, starting fresh');
        return;
      }
    }

    // Deserialize and restore state
    try {
      this.deserializeState(serialized);

      // Collect performance metrics
      const loadDuration = performance.now() - startTime;
      this.metrics.lastLoadDuration = loadDuration;
      this.metrics.totalLoads++;

      // Calculate average load duration
      if (this.metrics.averageLoadDuration === undefined) {
        this.metrics.averageLoadDuration = loadDuration;
      } else {
        this.metrics.averageLoadDuration =
          (this.metrics.averageLoadDuration * (this.metrics.totalLoads - 1) + loadDuration) /
          this.metrics.totalLoads;
      }

      logger.info('State loaded successfully', {
        version: serialized.version,
        missions: this.state.missions.size,
        checkpoints: this.state.checkpoints.size
      });
    } catch (error) {
      logger.error('Failed to deserialize state', error);
      throw new StateCorruptedError(
        stateFile,
        error instanceof Error ? error.message : 'Deserialization failed'
      );
    }
  }

  /**
   * Try to load and parse a state file
   * Returns null if file doesn't exist or is corrupted
   */
  private async tryLoadStateFile(filePath: string): Promise<SerializedState | null> {
    try {
      const json = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(json) as SerializedState;

      // Validate version
      if (parsed.version !== STATE_VERSION) {
        logger.warn(`State version mismatch: file=${parsed.version}, current=${STATE_VERSION}`);
        // In production, you'd run migration here
        // For now, we'll be lenient and try to load anyway
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, not an error
        return null;
      }

      logger.warn(`Failed to load state from ${filePath}`, error);
      return null;
    }
  }

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  /**
   * Serialize current state to JSON-compatible format
   */
  private serializeState(): SerializedState {
    const startTime = performance.now();

    const missions: Array<[string, SerializedMission]> = [];
    for (const [id, mission] of this.state.missions.entries()) {
      missions.push([id, this.serializeMission(mission)]);
    }

    const checkpoints: Array<[string, SerializedCheckpoint]> = [];
    for (const [id, checkpoint] of this.state.checkpoints.entries()) {
      checkpoints.push([id, this.serializeCheckpoint(checkpoint)]);
    }

    const serialized = {
      version: STATE_VERSION,
      timestamp: new Date().toISOString(),
      missions,
      checkpoints
    };

    // Collect serialization time
    this.metrics.lastSerializationTime = performance.now() - startTime;

    return serialized;
  }

  /**
   * Serialize a single mission
   */
  private serializeMission(mission: Mission): SerializedMission {
    return {
      config: mission.config,
      state: mission.state,
      createdAt: mission.createdAt.toISOString(),
      updatedAt: mission.updatedAt.toISOString(),
      attempts: mission.attempts.map(a => this.serializeAttempt(a)),
      currentAttempt: mission.currentAttempt,
      completedAt: mission.completedAt?.toISOString(),
      success: mission.success,
      errorMessage: mission.errorMessage
    };
  }

  /**
   * Serialize a single attempt
   */
  private serializeAttempt(attempt: Attempt): SerializedAttempt {
    return {
      attemptNumber: attempt.attemptNumber,
      timestamp: attempt.timestamp.toISOString(),
      output: attempt.output,
      value: attempt.value,
      validationResult: {
        passed: attempt.validationResult.passed,
        message: attempt.validationResult.message,
        actualValue: attempt.validationResult.actualValue,
        expectedValue: attempt.validationResult.expectedValue,
        timestamp: attempt.validationResult.timestamp.toISOString()
      },
      duration: attempt.duration
    };
  }

  /**
   * Serialize a single checkpoint
   */
  private serializeCheckpoint(checkpoint: Checkpoint): SerializedCheckpoint {
    return {
      id: checkpoint.id,
      missionId: checkpoint.missionId,
      timestamp: checkpoint.timestamp.toISOString(),
      missionSnapshot: this.serializeMission(checkpoint.missionSnapshot),
      attemptNumber: checkpoint.attemptNumber,
      metadata: checkpoint.metadata
    };
  }

  /**
   * Deserialize state and restore to runtime format
   */
  private deserializeState(serialized: SerializedState): void {
    const startTime = performance.now();

    // Clear existing state
    this.state.missions.clear();
    this.state.checkpoints.clear();

    // Restore missions
    for (const [id, serializedMission] of serialized.missions) {
      this.state.missions.set(id, this.deserializeMission(serializedMission));
    }

    // Restore checkpoints
    for (const [id, serializedCheckpoint] of serialized.checkpoints) {
      this.state.checkpoints.set(id, this.deserializeCheckpoint(serializedCheckpoint));
    }

    // Update last saved time
    this.state.lastSaved = new Date(serialized.timestamp);
    this.isDirty = false;

    // Collect deserialization time
    this.metrics.lastDeserializationTime = performance.now() - startTime;
  }

  /**
   * Deserialize a single mission
   */
  private deserializeMission(serialized: SerializedMission): Mission {
    return {
      config: serialized.config,
      state: serialized.state,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
      attempts: serialized.attempts.map(a => this.deserializeAttempt(a)),
      currentAttempt: serialized.currentAttempt,
      completedAt: serialized.completedAt ? new Date(serialized.completedAt) : undefined,
      success: serialized.success,
      errorMessage: serialized.errorMessage
    };
  }

  /**
   * Deserialize a single attempt
   */
  private deserializeAttempt(serialized: SerializedAttempt): Attempt {
    return {
      attemptNumber: serialized.attemptNumber,
      timestamp: new Date(serialized.timestamp),
      output: serialized.output,
      value: serialized.value,
      validationResult: {
        passed: serialized.validationResult.passed,
        message: serialized.validationResult.message,
        actualValue: serialized.validationResult.actualValue,
        expectedValue: serialized.validationResult.expectedValue,
        timestamp: new Date(serialized.validationResult.timestamp)
      },
      duration: serialized.duration
    };
  }

  /**
   * Deserialize a single checkpoint
   */
  private deserializeCheckpoint(serialized: SerializedCheckpoint): Checkpoint {
    return {
      id: serialized.id,
      missionId: serialized.missionId,
      timestamp: new Date(serialized.timestamp),
      missionSnapshot: this.deserializeMission(serialized.missionSnapshot),
      attemptNumber: serialized.attemptNumber,
      metadata: serialized.metadata
    };
  }

  /**
   * Force immediate save (for testing or manual triggers)
   */
  async forceSave(): Promise<void> {
    if (!this.state.config.enablePersistence) {
      throw new StatePersistenceError('force-save', 'Persistence is not enabled');
    }

    // Clear any pending debounced save
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await this.saveState();
  }

  /**
   * Close the StateManager and cleanup resources
   */
  close(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}
