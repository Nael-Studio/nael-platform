import type { RequestContext } from '../interfaces/http';

export interface ExceptionFilter {
  catch(exception: Error, context: RequestContext): Response | Promise<Response>;
}
