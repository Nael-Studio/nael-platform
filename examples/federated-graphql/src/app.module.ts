import { Module } from '@nl-framework/core';
import { ProductService } from './services/product.service';
import { ProductResolver } from './resolvers/product.resolver';

@Module({
  providers: [ProductService],
  resolvers: [ProductResolver],
})
export class AppModule {}
