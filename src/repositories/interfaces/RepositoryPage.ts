export interface RepositoryPage<T> {
  items: T[];
  nextCursor?: string;
}
