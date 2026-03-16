export function requireNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    return value.trim();
}

export function requireJobId(value: unknown): string | number {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error('jobId must be a finite number or string');
        }
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }

    throw new Error('jobId must be a non-empty string or finite number');
}
