import { Document, ObjectId } from '@nl-framework/orm';

@Document({ collection: 'users', timestamps: true, softDelete: true })
export class User {
  [key: string]: unknown;
  _id?: ObjectId;
  email!: string;
  name!: string;
  role: 'admin' | 'member' = 'member';
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
