import { ObjectType, Field, ID } from '@nl-framework/graphql';

@ObjectType({ description: 'Authenticated viewer information derived from the Better Auth session.' })
export class Viewer {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  email?: string | null;

  @Field({ nullable: true })
  name?: string | null;

  @Field({ description: 'Whether Better Auth has verified the email address.' })
  emailVerified!: boolean;
}
