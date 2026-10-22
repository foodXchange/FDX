"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SampleKitItem } from "@/types/sampleKit";

interface SampleKitContextType {
  items: SampleKitItem[];
  addItem: (item: SampleKitItem) => void;
  removeItem: (id: string) => void;
  clearKit: () => void;
  isItemInKit: (id: string) => boolean;
  isKitOpen: boolean;
  openKit: () => void;
  closeKit: () => void;
  updateItemFormat: (id: string, format: string) => void;
}

const SampleKitContext = createContext<SampleKitContextType | undefined>(undefined);

const STORAGE_KEY = "fdx_tasting_sample_kit_items";

export function SampleKitProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SampleKitItem[]>([]);
  const [isKitOpen, setIsKitOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load sample kit from localStorage:", e);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Could not persist sample kit to localStorage:", e);
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: SampleKitItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateItemFormat = useCallback((id: string, format: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, sample_format: format } : item))
    );
  }, []);

  const clearKit = useCallback(() => {
    setItems([]);
  }, []);

  const isItemInKit = useCallback(
    (id: string) => {
      return items.some((p) => p.id === id);
    },
    [items]
  );

  const openKit = useCallback(() => setIsKitOpen(true), []);
  const closeKit = useCallback(() => setIsKitOpen(false), []);

  return (
    <SampleKitContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearKit,
        isItemInKit,
        isKitOpen,
        openKit,
        closeKit,
        updateItemFormat,
      }}
    >
      {children}
    </SampleKitContext.Provider>
  );
}

export function useSampleKit() {
  const context = useContext(SampleKitContext);
  if (!context) {
    throw new Error("useSampleKit must be used within a SampleKitProvider");
  }
  return context;
}
