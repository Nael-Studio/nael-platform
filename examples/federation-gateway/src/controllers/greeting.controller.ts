import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { GreetingService } from '../services/greeting.service';

@Controller('greeting')
export class GreetingController {
  constructor(private readonly greetingService: GreetingService) {}

  @Get()
  getGreeting() {
    return this.greetingService.buildGreeting();
  }

  @Get(':name')
  getPersonalGreeting(ctx: RequestContext) {
    return this.greetingService.buildGreeting(ctx.params.name);
  }
}
