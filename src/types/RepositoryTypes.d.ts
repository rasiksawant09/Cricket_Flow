export {};

declare global {
  type Result<T> =
    | {
        readonly success: true;
        readonly data: T;
        readonly error?: never;
      }
    | {
        readonly success: false;
        readonly data?: never;
        readonly error: Error;
      };

  interface RepositoryPage<T> {
    items: T[];
    nextCursor?: string;
  }
}
