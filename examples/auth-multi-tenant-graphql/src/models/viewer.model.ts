import { Field, ObjectType } from '@nl-framework/graphql';

@ObjectType()
export class Viewer {
  @Field(() => String)
  tenant!: string;

  @Field(() => Boolean)
  authenticated!: boolean;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, { nullable: true })
  name!: string | null;
}
