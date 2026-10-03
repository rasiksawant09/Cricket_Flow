import { useEffect, useState } from "react";

export interface TournamentRequestState {
  isLoading: boolean;
  error: Error | null;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === "string" ? error : "The request could not be completed.");
}

export function useTournamentRequest<T>(load: () => Promise<Result<T>>): TournamentRequestState {
  const [state, setState] = useState({ load, isLoading: true, error: null as Error | null });

  useEffect(() => {
    let active = true;

    void load()
      .then((result) => {
        if (active) {
          setState({ load, isLoading: false, error: result.success ? null : result.error });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setState({ load, isLoading: false, error: toError(requestError) });
        }
      })

    return () => {
      active = false;
    };
  }, [load]);

  return state.load === load
    ? { isLoading: state.isLoading, error: state.error }
    : { isLoading: true, error: null };
}