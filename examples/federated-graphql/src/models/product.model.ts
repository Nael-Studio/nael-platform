import { ObjectType, Field, ID, Float } from '@nl-framework/graphql';

@ObjectType({
  federation: {
    keyFields: ['id'],
    shareable: true,
  },
})
export class Product {
  @Field(() => ID)
  id!: string;

  @Field()
  sku!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  price!: number;

  @Field({ nullable: true })
  inStock?: boolean;
}
