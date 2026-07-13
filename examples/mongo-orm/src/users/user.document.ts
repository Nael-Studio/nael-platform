import { Document, Prop, Version, BeforeInsert, ObjectId } from '@nl-framework/orm';

@Document({ collection: 'users', timestamps: true, softDelete: true })
export class User {
  [key: string]: unknown;
  _id?: ObjectId;

  @Prop({ unique: true })
  email!: string;

  @Prop()
  name!: string;

  @Prop({ default: 'member' })
  role: 'admin' | 'member' = 'member';

  // Optimistic locking — save()/updateOne guard on this and $inc it.
  @Version()
  version!: number;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  // Lifecycle hook: normalize the email before every insert.
  @BeforeInsert()
  normalizeEmail(): void {
    if (typeof this.email === 'string') {
      this.email = this.email.trim().toLowerCase();
    }
  }
}
