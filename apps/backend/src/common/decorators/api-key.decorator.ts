import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiKeyFromRequest = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers['x-api-key'] || request.query['api_key'];
});
