import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BookSummary } from '../api/types';
import { loadLibrary, saveLibrary, summaryToEntry, type LibraryEntry, type ReadingStatus } from './library';

type LibraryContextValue = {
  entries: LibraryEntry[];
  isLoading: boolean;
  isInLibrary: (workKey: string) => boolean;
  getEntry: (workKey: string) => LibraryEntry | undefined;
  addBook: (summary: BookSummary, status?: ReadingStatus) => Promise<void>;
  removeBook: (workKey: string) => Promise<void>;
  setStatus: (workKey: string, status: ReadingStatus) => Promise<void>;
  setRating: (workKey: string, rating: number | undefined) => Promise<void>;
  setNote: (workKey: string, note: string) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLibrary()
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, []);

  // Every mutation computes the next array inside a setEntries updater (so it
  // always starts from the latest state), then writes that same array to disk
  // as a side effect — never a second setEntries call from in here.
  const persist = useCallback((next: LibraryEntry[]) => {
    saveLibrary(next).catch(() => {
      // Best-effort: local persistence failing shouldn't crash the session.
    });
  }, []);

  const addBook = useCallback(
    async (summary: BookSummary, status: ReadingStatus = 'to_read') => {
      setEntries((current) => {
        if (current.some((e) => e.id === summary.workKey)) return current;
        const next = [summaryToEntry(summary, status), ...current];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeBook = useCallback(
    async (workKey: string) => {
      setEntries((current) => {
        const next = current.filter((e) => e.id !== workKey);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setStatus = useCallback(
    async (workKey: string, status: ReadingStatus) => {
      setEntries((current) => {
        const next = current.map((e) => (e.id === workKey ? { ...e, status } : e));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setRating = useCallback(
    async (workKey: string, rating: number | undefined) => {
      setEntries((current) => {
        const next = current.map((e) => (e.id === workKey ? { ...e, rating } : e));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setNote = useCallback(
    async (workKey: string, note: string) => {
      setEntries((current) => {
        const next = current.map((e) => (e.id === workKey ? { ...e, note } : e));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isInLibrary = useCallback((workKey: string) => entries.some((e) => e.id === workKey), [entries]);
  const getEntry = useCallback((workKey: string) => entries.find((e) => e.id === workKey), [entries]);

  const value = useMemo(
    () => ({ entries, isLoading, isInLibrary, getEntry, addBook, removeBook, setStatus, setRating, setNote }),
    [entries, isLoading, isInLibrary, getEntry, addBook, removeBook, setStatus, setRating, setNote],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
}
