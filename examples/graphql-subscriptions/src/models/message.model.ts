import { ObjectType, Field } from '@nl-framework/graphql';

@ObjectType()
export class ChatMessage {
  @Field()
  id!: string;

  @Field()
  room!: string;

  @Field()
  author!: string;

  @Field()
  text!: string;

  @Field({ description: 'Unix epoch milliseconds when the message was sent.' })
  sentAt!: number;
}
