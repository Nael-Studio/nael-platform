import { Document, ObjectId } from '@nl-framework/orm';

@Document({ collection: 'auth_users', timestamps: true })
export class AuthUserDocument {
  [key: string]: unknown;
  _id?: ObjectId;
  email!: string;
  passwordHash!: string;
  salt!: string;
  roles: string[] = ['user'];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
