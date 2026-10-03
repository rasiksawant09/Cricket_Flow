import type { RepositoryPage } from "../../repositories/interfaces/RepositoryPage";

export function serviceFailure<T>(message: string, cause?: unknown): Result<T> {
  if (cause instanceof Error) {
    return { success: false, error: cause };
  }
  if (typeof cause === "string" && cause.length > 0) {
    return { success: false, error: new Error(cause) };
  }
  return { success: false, error: new Error(message) };
}

export async function guardService<T>(
  message: string,
  operation: () => Promise<Result<T>>,
): Promise<Result<T>> {
  try {
    return await operation();
  } catch (error) {
    return serviceFailure(message, error);
  }
}

export async function readAllPages<T>(
  message: string,
  readPage: (cursor?: string) => Promise<Result<RepositoryPage<T>>>,
): Promise<Result<T[]>> {
  try {
    const items: T[] = [];
    let cursor: string | undefined;

    do {
      const result = await readPage(cursor);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      items.push(...result.data.items);
      cursor = result.data.nextCursor;
    } while (cursor !== undefined);

    return { success: true, data: items };
  } catch (error) {
    return serviceFailure(message, error);
  }
}
