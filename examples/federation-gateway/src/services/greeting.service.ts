import { Injectable } from '@nl-framework/core';

@Injectable()
export class GreetingService {
  buildGreeting(name?: string) {
    const subject = name?.trim() ? name : 'friend';
    return {
      message: `Hello, ${subject}! Welcome to the federation gateway.`,
      timestamp: Date.now(),
    };
  }
}
