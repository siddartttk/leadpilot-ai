"use client";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, useContext, useState, useCallback } from "react";
type Notice = { message: string; error: boolean };
const NoticeContext = createContext<{
  notify: (message: string, error?: boolean) => void;
  run: <T>(
    action: () => Promise<T>,
    success?: string,
  ) => Promise<T | undefined>;
}>({ notify: () => {}, run: async () => undefined });
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 15000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Notices>{children}</Notices>
    </QueryClientProvider>
  );
}
function Notices({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const client = useQueryClient();
  const notify = useCallback((message: string, error = false) => {
    setNotice({ message, error });
  }, []);
  async function run<T>(action: () => Promise<T>, success?: string) {
    try {
      const value = await action();
      await client.invalidateQueries();
      if (success) notify(success);
      return value;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Something went wrong.",
        true,
      );
    }
  }
  return (
    <NoticeContext.Provider value={{ notify, run }}>
      {children}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={"toast " + (notice.error ? "toast-error" : "")}
        >
          <span>{notice.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
    </NoticeContext.Provider>
  );
}
export const useNotice = () => useContext(NoticeContext);
