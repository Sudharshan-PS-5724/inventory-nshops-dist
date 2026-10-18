import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AccessDeniedError } from './domain/access-policy.js';

@Catch(AccessDeniedError)
export class AccessDeniedFilter implements ExceptionFilter {
  catch(error: AccessDeniedError, host: ArgumentsHost) {
    host.switchToHttp().getResponse<FastifyReply>().status(403).send({
      statusCode: 403,
      code: 'ACCESS_DENIED',
      message: error.message,
    });
  }
}
