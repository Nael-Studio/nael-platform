import { Injectable } from '@nl-framework/core';
import {
  Resolver,
  Query,
  Arg,
  ID,
  ResolveReference,
  Parent,
} from '@nl-framework/graphql';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';

@Injectable()
@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly products: ProductService) {}

  @Query(() => [Product], { description: 'Return all products in this subgraph.' })
  productsCatalog(): Product[] {
    return this.products.list();
  }

  @Query(() => Product, { nullable: true })
  productById(@Arg('id', () => ID) id: string): Product | undefined {
    return this.products.findById(id);
  }

  @ResolveReference(() => Product)
  resolveReference(@Parent() reference: { id?: string; sku?: string }): Product | undefined {
    if (reference.id) {
      return this.products.findById(reference.id);
    }
    if (reference.sku) {
      return this.products.findBySku(reference.sku);
    }
    return undefined;
  }
}
