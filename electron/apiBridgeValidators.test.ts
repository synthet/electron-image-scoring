import { describe, expect, it } from 'vitest';
import { requireJobId, requireNonEmptyString } from './apiBridgeValidators';

describe('apiBridgeValidators', () => {
    it('accepts non-empty trimmed strings', () => {
        expect(requireNonEmptyString('  hello  ', 'field')).toBe('hello');
    });

    it('rejects empty strings and non-strings', () => {
        expect(() => requireNonEmptyString('', 'field')).toThrow('field must be a non-empty string');
        expect(() => requireNonEmptyString(null, 'field')).toThrow('field must be a non-empty string');
    });

    it('accepts string and numeric job IDs', () => {
        expect(requireJobId('  job-1 ')).toBe('job-1');
        expect(requireJobId(42)).toBe(42);
    });

    it('rejects invalid job IDs', () => {
        expect(() => requireJobId(Number.NaN)).toThrow('jobId must be a finite number or string');
        expect(() => requireJobId('')).toThrow('jobId must be a non-empty string or finite number');
    });
});
