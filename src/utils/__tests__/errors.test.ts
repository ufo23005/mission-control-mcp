/**
 * Unit Tests for Enhanced Error Messages
 * Tests contextual error information
 */

import {
  MissionNotFoundError,
  MissionExistsError,
  StatePersistenceError,
  StateCorruptedError,
  StateDirectoryError,
  StateVersionError
} from '../errors';

describe('Enhanced Error Messages', () => {
  describe('MissionNotFoundError', () => {
    it('should create error without context', () => {
      const error = new MissionNotFoundError('test-mission-id');

      expect(error.message).toBe('Mission not found: test-mission-id');
      expect(error.code).toBe('MISSION_NOT_FOUND');
      expect(error.name).toBe('MissionNotFoundError');
    });

    it('should include available missions count in context', () => {
      const error = new MissionNotFoundError('test-mission-id', {
        availableMissions: 5
      });

      expect(error.message).toContain('Mission not found: test-mission-id');
      expect(error.message).toContain('Available missions: 5');
    });

    it('should include suggestion in context', () => {
      const error = new MissionNotFoundError('test-mission-id', {
        suggestion: 'Use getAllMissions() to list available missions'
      });

      expect(error.message).toContain('Mission not found: test-mission-id');
      expect(error.message).toContain('Use getAllMissions() to list available missions');
    });

    it('should include both availableMissions and suggestion', () => {
      const error = new MissionNotFoundError('test-mission-id', {
        availableMissions: 3,
        suggestion: 'Check mission ID spelling'
      });

      expect(error.message).toContain('Mission not found: test-mission-id');
      expect(error.message).toContain('Available missions: 3');
      expect(error.message).toContain('Check mission ID spelling');
    });

    it('should handle zero available missions', () => {
      const error = new MissionNotFoundError('test-mission-id', {
        availableMissions: 0,
        suggestion: 'No missions exist yet'
      });

      expect(error.message).toContain('Available missions: 0');
    });
  });

  describe('MissionExistsError', () => {
    it('should create error without context', () => {
      const error = new MissionExistsError('duplicate-mission');

      expect(error.message).toBe('Mission already exists: duplicate-mission');
      expect(error.code).toBe('MISSION_EXISTS');
      expect(error.name).toBe('MissionExistsError');
    });

    it('should include existing state in context', () => {
      const error = new MissionExistsError('duplicate-mission', {
        existingState: 'IN_PROGRESS'
      });

      expect(error.message).toContain('Mission already exists: duplicate-mission');
      expect(error.message).toContain('Current state: IN_PROGRESS');
    });

    it('should include suggestion in context', () => {
      const error = new MissionExistsError('duplicate-mission', {
        suggestion: 'Use a different mission ID or delete the existing mission'
      });

      expect(error.message).toContain('Mission already exists: duplicate-mission');
      expect(error.message).toContain('Use a different mission ID or delete the existing mission');
    });

    it('should include both existingState and suggestion', () => {
      const error = new MissionExistsError('duplicate-mission', {
        existingState: 'COMPLETED',
        suggestion: 'Consider cleaning up old missions'
      });

      expect(error.message).toContain('Mission already exists: duplicate-mission');
      expect(error.message).toContain('Current state: COMPLETED');
      expect(error.message).toContain('Consider cleaning up old missions');
    });
  });

  describe('StatePersistenceError', () => {
    it('should create error without context', () => {
      const error = new StatePersistenceError('save', 'Disk full');

      expect(error.message).toBe('State persistence failed (save): Disk full');
      expect(error.code).toBe('STATE_PERSISTENCE_ERROR');
      expect(error.name).toBe('StatePersistenceError');
    });

    it('should include suggestion in context', () => {
      const error = new StatePersistenceError('save', 'Permission denied', {
        suggestion: 'Check directory permissions'
      });

      expect(error.message).toContain('State persistence failed (save): Permission denied');
      expect(error.message).toContain('Check directory permissions');
    });

    it('should handle different operations', () => {
      const saveError = new StatePersistenceError('save', 'Disk full');
      const loadError = new StatePersistenceError('load', 'File not found');

      expect(saveError.message).toContain('(save)');
      expect(loadError.message).toContain('(load)');
    });
  });

  describe('StateCorruptedError', () => {
    it('should create error without context', () => {
      const error = new StateCorruptedError('/path/to/state.json', 'Invalid JSON');

      expect(error.message).toContain('Corrupted state file at /path/to/state.json');
      expect(error.message).toContain('Invalid JSON');
      expect(error.code).toBe('STATE_CORRUPTED');
      expect(error.name).toBe('StateCorruptedError');
    });

    it('should indicate backup availability', () => {
      const error = new StateCorruptedError('/path/to/state.json', 'Parse error', {
        hasBackup: true
      });

      expect(error.message).toContain('Backup file available for recovery');
    });

    it('should include recovery steps', () => {
      const error = new StateCorruptedError('/path/to/state.json', 'Corrupted data', {
        recoverySteps: 'Delete the corrupted file and restart'
      });

      expect(error.message).toContain('Delete the corrupted file and restart');
    });

    it('should include both hasBackup and recoverySteps', () => {
      const error = new StateCorruptedError('/path/to/state.json', 'Invalid format', {
        hasBackup: true,
        recoverySteps: 'System will attempt automatic recovery'
      });

      expect(error.message).toContain('Backup file available for recovery');
      expect(error.message).toContain('System will attempt automatic recovery');
    });
  });

  describe('StateDirectoryError', () => {
    it('should create error without suggestion', () => {
      const error = new StateDirectoryError('/invalid/path', 'Directory does not exist');

      expect(error.message).toContain('State directory error at /invalid/path');
      expect(error.message).toContain('Directory does not exist');
      expect(error.code).toBe('STATE_DIRECTORY_ERROR');
      expect(error.name).toBe('StateDirectoryError');
    });

    it('should include suggestion when provided', () => {
      const error = new StateDirectoryError(
        '/invalid/path',
        'Permission denied',
        'Run with elevated permissions'
      );

      expect(error.message).toContain('State directory error at /invalid/path');
      expect(error.message).toContain('Permission denied');
      expect(error.message).toContain('Run with elevated permissions');
    });
  });

  describe('StateVersionError', () => {
    it('should create error with migration unavailable', () => {
      const error = new StateVersionError('2.0.0', '1.0.0', false);

      expect(error.message).toContain('Incompatible state version');
      expect(error.message).toContain('file=1.0.0');
      expect(error.message).toContain('current=2.0.0');
      expect(error.message).toContain('Manual migration may be required');
      expect(error.code).toBe('STATE_VERSION_ERROR');
      expect(error.name).toBe('StateVersionError');
    });

    it('should indicate when migration is available', () => {
      const error = new StateVersionError('2.0.0', '1.0.0', true);

      expect(error.message).toContain('Migration available for this version');
      expect(error.message).not.toContain('Manual migration may be required');
    });

    it('should default to migration unavailable', () => {
      const error = new StateVersionError('2.0.0', '1.0.0');

      expect(error.message).toContain('Manual migration may be required');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with old MissionNotFoundError usage', () => {
      const error = new MissionNotFoundError('mission-123');

      expect(error.message).toBe('Mission not found: mission-123');
      expect(error).toBeInstanceOf(MissionNotFoundError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should maintain compatibility with old MissionExistsError usage', () => {
      const error = new MissionExistsError('mission-456');

      expect(error.message).toBe('Mission already exists: mission-456');
      expect(error).toBeInstanceOf(MissionExistsError);
    });

    it('should maintain compatibility with old StatePersistenceError usage', () => {
      const error = new StatePersistenceError('save', 'Test error');

      expect(error.message).toBe('State persistence failed (save): Test error');
      expect(error).toBeInstanceOf(StatePersistenceError);
    });

    it('should maintain compatibility with old StateCorruptedError usage', () => {
      const error = new StateCorruptedError('/path/to/file', 'Corruption detected');

      expect(error.message).toContain('Corrupted state file');
      expect(error).toBeInstanceOf(StateCorruptedError);
    });
  });

  describe('Error Hierarchy', () => {
    it('should maintain inheritance hierarchy', () => {
      const missionNotFound = new MissionNotFoundError('test');
      const missionExists = new MissionExistsError('test');
      const persistenceError = new StatePersistenceError('save', 'test');
      const corruptedError = new StateCorruptedError('/path', 'test');

      expect(missionNotFound).toBeInstanceOf(Error);
      expect(missionExists).toBeInstanceOf(Error);
      expect(persistenceError).toBeInstanceOf(Error);
      expect(corruptedError).toBeInstanceOf(StatePersistenceError);
      expect(corruptedError).toBeInstanceOf(Error);
    });

    it('should preserve error codes', () => {
      const errors = [
        new MissionNotFoundError('test'),
        new MissionExistsError('test'),
        new StatePersistenceError('save', 'test'),
        new StateCorruptedError('/path', 'test'),
        new StateDirectoryError('/path', 'test'),
        new StateVersionError('2.0', '1.0')
      ];

      errors.forEach(error => {
        expect(error.code).toBeTruthy();
        expect(typeof error.code).toBe('string');
      });
    });
  });
});
