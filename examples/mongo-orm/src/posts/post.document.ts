import { Document, Prop, Ref, ObjectId, type Ref as RefT } from '@nl-framework/orm';
import { User } from '../users/user.document';

/**
 * Demonstrates relations: `authorId` stores an ObjectId and can be populated into
 * a hydrated `User` in a single batched query:
 *
 * ```ts
 * const posts = await postRepo.find({}, { populate: ['authorId'] });
 * // posts[0].authorId is now a User instance
 * ```
 */
@Document({ collection: 'posts', timestamps: true })
export class Post {
  [key: string]: unknown;
  _id?: ObjectId;

  @Prop()
  title!: string;

  @Ref(() => User)
  authorId!: RefT<User>;

  createdAt?: Date;
  updatedAt?: Date;
}
