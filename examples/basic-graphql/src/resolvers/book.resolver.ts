import { Injectable } from '@nl-framework/core';
import { Resolver, Query, Mutation, Arg, ID } from '@nl-framework/graphql';
import { Book } from '../models/book.model';
import { CreateBookInput } from '../dto/create-book.input';
import { BookService } from '../services/book.service';

@Injectable()
@Resolver(() => Book)
export class BookResolver {
  constructor(private readonly bookService: BookService) {}

  @Query(() => [Book], { description: 'List all books in the in-memory catalog.' })
  books(): Book[] {
    return this.bookService.findAll();
  }

  @Query(() => Book, { nullable: true, description: 'Find a single book by its identifier.' })
  book(@Arg('id', () => ID) id: string): Book | undefined {
    return this.bookService.findOne(id);
  }

  @Mutation(() => Book, { description: 'Insert a new book into the catalog.' })
  addBook(@Arg('input', () => CreateBookInput) input: CreateBookInput): Book {
    return this.bookService.create(input);
  }
}
