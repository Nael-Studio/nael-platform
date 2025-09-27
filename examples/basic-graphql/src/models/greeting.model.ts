import { ObjectType, Field } from '@nl-framework/graphql';

@ObjectType()
export class Greeting {
  @Field()
  message!: string;

  @Field({ description: 'Unix epoch milliseconds when the greeting was generated.' })
  timestamp!: number;
}
