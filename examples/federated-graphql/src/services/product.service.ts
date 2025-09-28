import { randomUUID } from 'node:crypto';
import { Injectable } from '@nl-framework/core';
import { Product } from '../models/product.model';

@Injectable()
export class ProductService {
  private readonly products = new Map<string, Product>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const initial: Array<Omit<Product, 'id'>> = [
      {
        sku: 'studio-headphones',
        name: 'Studio Headphones',
        price: 199,
        inStock: true,
      },
      {
        sku: 'mechanical-keyboard',
        name: 'Mechanical Keyboard',
        price: 149,
        inStock: false,
      },
    ];

    for (const item of initial) {
      const product: Product = {
        id: randomUUID(),
        ...item,
      };
      this.products.set(product.id, product);
    }
  }

  findAll(): Product[] {
    return Array.from(this.products.values());
  }

  findOne(id: string): Product | undefined {
    return this.products.get(id);
  }

  findBySku(sku: string): Product | undefined {
    return Array.from(this.products.values()).find((product) => product.sku === sku);
  }
}
