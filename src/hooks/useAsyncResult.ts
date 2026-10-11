import { useEffect, useState } from "react";

type AsyncLoader<T> = () => Promise<Result<T>>;

interface AsyncResultState<T> {
  loader: AsyncLoader<T>;
  enabled: boolean;
  refreshKey: number | string | undefined;
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "The request could not be completed.");
}

export function useAsyncResult<T>(loader: AsyncLoader<T>, enabled = true, refreshKey?: number | string) {
  const [state, setState] = useState<AsyncResultState<T>>({
    loader,
    enabled,
    refreshKey,
    data: null,
    isLoading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    void loader()
      .then((result) => {
        if (active) {
          setState({
            loader,
            enabled,
            refreshKey,
            data: result.success ? result.data : null,
            isLoading: false,
            error: result.success ? null : result.error,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ loader, enabled, refreshKey, data: null, isLoading: false, error: toError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [loader, enabled, refreshKey]);

  if (!enabled) return { data: null, isLoading: false, error: null };
  if (state.loader !== loader || state.enabled !== enabled || state.refreshKey !== refreshKey) {
    return { data: null, isLoading: true, error: null };
  }
  return { data: state.data, isLoading: state.isLoading, error: state.error };
}