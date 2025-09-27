import { Controller } from '@nl-framework/core';
import { Get } from '@nl-framework/http';
import { GreetingService } from './greeting.service';

@Controller()
export class RootController {
  constructor(private readonly greetingService: GreetingService) {}

  @Get()
  getRootGreeting() {
    return this.greetingService.buildGreeting();
  }
}
