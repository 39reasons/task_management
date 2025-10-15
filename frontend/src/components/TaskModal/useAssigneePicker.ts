import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import type { User } from "@shared/types";

import type { ProjectMember } from "./types";

interface UseAssigneePickerOptions {
  assignee: User | null;
  members: ProjectMember[];
  onSearchMembers: (query: string) => Promise<ProjectMember[]>;
  isMembersLoading: boolean;
  isSearchingMembers: boolean;
  onAssignMember: (memberId: string) => Promise<void> | void;
  isAssigningAssignee: boolean;
}

interface UseAssigneePickerResult {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  query: string;
  trimmedQuery: string;
  normalizedQuery: string;
  handleQueryChange: (value: string) => Promise<void>;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  visibleMembers: ProjectMember[];
  isLoadingVisibleMembers: boolean;
  isShowingSearchResults: boolean;
  handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSelectMember: (memberId: string) => void;
}

export function useAssigneePicker({
  assignee,
  members,
  onSearchMembers,
  isMembersLoading,
  isSearchingMembers,
  onAssignMember,
  isAssigningAssignee,
}: UseAssigneePickerOptions): UseAssigneePickerResult {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ProjectMember[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestSearchToken = useRef(0);

  const baseMembers = useMemo(() => {
    if (!assignee) {
      return members;
    }

    const exists = members.some((member) => member.id === assignee.id);
    if (exists) {
      return members;
    }

    return [
      {
        id: assignee.id,
        first_name: assignee.first_name,
        last_name: assignee.last_name,
        username: assignee.username,
        avatar_color: assignee.avatar_color ?? null,
      },
      ...members,
    ];
  }, [assignee, members]);

  useEffect(() => {
    setQuery("");
    setSearchResults([]);
    latestSearchToken.current += 1;
  }, [assignee?.id]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
      latestSearchToken.current += 1;
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleQueryChange = useCallback(
    async (value: string) => {
      setQuery(value);
      const token = ++latestSearchToken.current;
      const trimmed = value.trim();

      if (!trimmed) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await onSearchMembers(trimmed);
        if (latestSearchToken.current === token) {
          setSearchResults(results);
        }
      } catch (error) {
        if (latestSearchToken.current === token) {
          setSearchResults([]);
        }
        console.error("Failed to search assignees", error);
      }
    },
    [onSearchMembers]
  );

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const isShowingSearchResults = normalizedQuery.length > 0;
  const visibleMembers = isShowingSearchResults ? searchResults : baseMembers;
  const isLoadingVisibleMembers = isShowingSearchResults
    ? isSearchingMembers
    : isMembersLoading;

  const handleSelectMember = useCallback(
    (memberId: string) => {
      if (isAssigningAssignee || assignee?.id === memberId) {
        return;
      }
      void onAssignMember(memberId);
    },
    [assignee?.id, isAssigningAssignee, onAssignMember]
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (isLoadingVisibleMembers || visibleMembers.length === 0) {
          return;
        }
        const first = visibleMembers[0];
        handleSelectMember(first.id);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    },
    [handleSelectMember, isLoadingVisibleMembers, visibleMembers]
  );

  return {
    isOpen,
    setIsOpen,
    query,
    trimmedQuery,
    normalizedQuery,
    handleQueryChange,
    inputRef,
    visibleMembers,
    isLoadingVisibleMembers,
    isShowingSearchResults,
    handleInputKeyDown,
    handleSelectMember,
  };
}
