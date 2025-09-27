import { ObjectType, Field, ID } from '@nl-framework/graphql';

@ObjectType()
export class Book {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  author!: string;

  @Field({ nullable: true })
  publishedYear?: number;
}
