/**
 * Unit Tests for Logger
 * Tests logging levels and filtering
 */

import { Logger, LogLevel } from '../logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Default Log Level', () => {
    it('should default to INFO level', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });
  });

  describe('LogLevel.DEBUG', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should log all levels', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.critical('critical message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[CRITICAL] critical message');
    });
  });

  describe('LogLevel.INFO', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.INFO);
    });

    it('should log INFO and above', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });
  });

  describe('LogLevel.WARN', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.WARN);
    });

    it('should log WARN and above', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });
  });

  describe('LogLevel.ERROR', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.ERROR);
    });

    it('should log ERROR and above', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.critical('critical message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[CRITICAL] critical message');
    });
  });

  describe('LogLevel.CRITICAL', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.CRITICAL);
    });

    it('should log only CRITICAL', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.critical('critical message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[CRITICAL] critical message');
    });
  });

  describe('setLevel()', () => {
    it('should change log level dynamically', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.DEBUG);
      logger.info('should log');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] should log');
    });

    it('should affect all subsequent log calls', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('info 1');
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.INFO);
      logger.info('info 2');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info 2');
    });
  });

  describe('Log Messages with Arguments', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should pass additional arguments to console', () => {
      const obj = { key: 'value' };
      const arr = [1, 2, 3];

      logger.debug('debug with args', obj, arr);
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug with args', obj, arr);
    });

    it('should handle multiple arguments for info', () => {
      logger.info('info message', 1, true, null);
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message', 1, true, null);
    });

    it('should handle error objects', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error occurred', error);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('');
      logger.info('');
      logger.warn('');
      logger.error('');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] ');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] ');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] ');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] ');
    });

    it('should handle messages with special characters', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Message with\nnewlines\tand\ttabs');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Message with\nnewlines\tand\ttabs');
    });

    it('should handle very long messages', () => {
      logger.setLevel(LogLevel.INFO);
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`[INFO] ${longMessage}`);
    });
  });

  describe('Multiple Logger Instances', () => {
    it('should allow independent configuration of different instances', () => {
      const logger1 = new Logger();
      const logger2 = new Logger();

      logger1.setLevel(LogLevel.ERROR);
      logger2.setLevel(LogLevel.DEBUG);

      logger1.info('logger1 info');
      expect(consoleInfoSpy).not.toHaveBeenCalled();

      logger2.info('logger2 info');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] logger2 info');
    });
  });
});
