import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  readonly status: 'ok';
}

@Injectable()
export class HealthService {
  getLive(): HealthStatus {
    return { status: 'ok' };
  }
}
