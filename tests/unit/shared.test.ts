import { Result } from '../../src/shared/Result';
import {
  AppError,
  ValidationError,
  AutomationError,
} from '../../src/shared/errors';

describe('Result type', () => {
  it('should create a success result', () => {
    const result = Result.ok({ claimId: '123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.claimId).toBe('123');
    }
  });

  it('should create a failure result', () => {
    const result = Result.fail(new Error('Something went wrong'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Something went wrong');
    }
  });
});

describe('AppError', () => {
  it('should create a base error with defaults', () => {
    const err = new AppError('test');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('should create a ValidationError with 400 status', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should create an AutomationError with 422 status', () => {
    const err = new AutomationError('Form rejected');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('AUTOMATION_ERROR');
  });
});