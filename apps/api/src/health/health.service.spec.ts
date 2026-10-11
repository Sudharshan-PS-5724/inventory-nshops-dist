import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports the running process as healthy', () => {
    expect(new HealthService().getLive()).toEqual({ status: 'ok' });
  });
});
