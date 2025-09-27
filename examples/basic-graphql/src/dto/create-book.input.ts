import { InputType, Field } from '@nl-framework/graphql';

@InputType()
export class CreateBookInput {
  @Field()
  title!: string;

  @Field()
  author!: string;

  @Field({ nullable: true })
  publishedYear?: number;
}
