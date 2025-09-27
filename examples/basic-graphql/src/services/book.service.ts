import { randomUUID } from 'node:crypto';
import { Injectable } from '@nl-framework/core';
import { Book } from '../models/book.model';
import { CreateBookInput } from '../dto/create-book.input';

@Injectable()
export class BookService {
  private readonly books = new Map<string, Book>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const initial: Array<Omit<Book, 'id'>> = [
      {
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        publishedYear: 1999,
      },
      {
        title: 'Clean Architecture',
        author: 'Robert C. Martin',
        publishedYear: 2017,
      },
    ];

    for (const item of initial) {
      const book: Book = {
        id: randomUUID(),
        ...item,
      };
      this.books.set(book.id, book);
    }
  }

  findAll(): Book[] {
    return Array.from(this.books.values());
  }

  findOne(id: string): Book | undefined {
    return this.books.get(id);
  }

  create(input: CreateBookInput): Book {
    const book: Book = {
      id: randomUUID(),
      ...input,
    };
    this.books.set(book.id, book);
    return book;
  }
}
