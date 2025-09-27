export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}

export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>;
}

export type Lifecycle = Partial<OnModuleInit & OnModuleDestroy>;
