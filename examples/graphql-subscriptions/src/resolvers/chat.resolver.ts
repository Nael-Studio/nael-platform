import { Injectable } from '@nl-framework/core';
import { Resolver, Query, Mutation, Subscription, Arg } from '@nl-framework/graphql';
import { ChatMessage } from '../models/message.model';
import { pubsub, messageTopic } from '../pubsub';

let counter = 0;

@Injectable()
@Resolver(() => ChatMessage)
export class ChatResolver {
  private readonly history: ChatMessage[] = [];

  @Query(() => ChatMessage, { list: true, description: 'Recent messages in a room.' })
  messages(@Arg('room') room: string): ChatMessage[] {
    return this.history.filter((message) => message.room === room);
  }

  @Mutation(() => ChatMessage, { description: 'Post a message and notify subscribers.' })
  async sendMessage(
    @Arg('room') room: string,
    @Arg('author') author: string,
    @Arg('text') text: string,
  ): Promise<ChatMessage> {
    counter += 1;
    const message: ChatMessage = {
      id: String(counter),
      room,
      author,
      text,
      sentAt: Date.now(),
    };
    this.history.push(message);
    await pubsub.publish(messageTopic(room), message);
    return message;
  }

  @Subscription(() => ChatMessage, {
    // Dynamic topic derived from the subscription argument, so each room is its
    // own stream.
    topics: (args: { room: string }) => messageTopic(args.room),
    description: 'Live feed of messages posted to a room.',
  })
  messageSent(@Arg('room') _room: string) {}
}
