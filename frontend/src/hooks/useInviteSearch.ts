import { useCallback, useEffect, useMemo, useState, KeyboardEvent } from "react";
import { useLazyQuery } from "@apollo/client";

import { SEARCH_USERS } from "../graphql";
import type { InviteeSuggestion } from "../types/invitations";

interface UseInviteSearchOptions {
  isOpen: boolean;
  selectedUsers: InviteeSuggestion[];
  debounceMs?: number;
}

interface UseInviteSearchResult {
  query: string;
  setQuery: (value: string) => void;
  suggestions: InviteeSuggestion[];
  searching: boolean;
  showSuggestions: boolean;
  activeIndex: number;
  handleKeyNavigation: (event: KeyboardEvent<HTMLInputElement>) => InviteeSuggestion | null;
  resetSearch: () => void;
}

export function useInviteSearch({
  isOpen,
  selectedUsers,
  debounceMs = 200,
}: UseInviteSearchOptions): UseInviteSearchResult {
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [runSearch, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const suggestions = useMemo(() => {
    const results = (searchData?.searchUsers ?? []) as InviteeSuggestion[];
    const selectedIds = new Set(selectedUsers.map((user) => user.id));
    return results.filter((user) => !selectedIds.has(user.id));
  }, [searchData, selectedUsers]);

  const resetSearch = useCallback(() => {
    setQueryState("");
    setActiveIndex(-1);
    setShowSuggestions(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetSearch();
      return;
    }

    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    const timeout = setTimeout(() => {
      setActiveIndex(-1);
      setShowSuggestions(true);
      runSearch({ variables: { query: trimmed } }).catch(() => {});
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [query, isOpen, runSearch, debounceMs, resetSearch]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  const handleKeyNavigation = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        return null;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        return null;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return null;
      }

      if (event.key === "Enter" && activeIndex >= 0 && activeIndex < suggestions.length) {
        event.preventDefault();
        return suggestions[activeIndex];
      }

      return null;
    },
    [activeIndex, showSuggestions, suggestions]
  );

  return {
    query,
    setQuery,
    suggestions,
    searching,
    showSuggestions,
    activeIndex,
    handleKeyNavigation,
    resetSearch,
  };
}
