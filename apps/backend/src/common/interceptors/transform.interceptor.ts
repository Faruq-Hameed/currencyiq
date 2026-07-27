import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error: null;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Controllers that already return { data, ...meta? } get spread as-is; anything
        // else gets wrapped. Requiring `meta` too (as this used to) meant a `{ data }`
        // return with no `meta` key fell through to the wrap branch and got double-nested
        // as `{ data: { data: ... } }` — most controllers hit exactly that case.
        if (data && typeof data === 'object' && 'data' in data) {
          return { success: true, meta: undefined, ...data, error: null };
        }
        return { success: true, data, meta: undefined, error: null };
      }),
    );
  }
}
