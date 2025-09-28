import { Injectable } from '@nl-framework/core';
import { Resolver, Query, Arg, ID, ResolveReference, Parent } from '@nl-framework/graphql';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';

@Injectable()
@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Query(() => [Product], { description: 'List all products available from this subgraph.' })
  products(): Product[] {
    return this.productService.findAll();
  }

  @Query(() => Product, { nullable: true, description: 'Find a single product by its identifier.' })
  product(@Arg('id', () => ID) id: string): Product | undefined {
    return this.productService.findOne(id);
  }

  @ResolveReference(() => Product)
  resolveReference(@Parent() reference: { id?: string; sku?: string }): Product | undefined {
    if (reference.id) {
      return this.productService.findOne(reference.id);
    }
    if (reference.sku) {
      return this.productService.findBySku(reference.sku);
    }
    return undefined;
  }
}
