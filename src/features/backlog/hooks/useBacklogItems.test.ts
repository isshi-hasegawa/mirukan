import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { TestQueryClientProvider } from "../../../test/query-client.tsx";
import * as backlogRepository from "../backlog-repository.ts";
import type { BacklogItem } from "../types.ts";
import { useBacklogItems } from "./useBacklogItems.ts";

vi.mock("../backlog-repository.ts");

const mockFetchBacklogItems = vi.mocked(backlogRepository.fetchBacklogItems);

const stubItem: BacklogItem = {
  id: "item-1",
  status: "stacked",
  primary_platform: null,
  note: null,
  sort_order: 1000,
  works: null,
};

describe("useBacklogItems", () => {
  test("正常取得時はデータを返し isLoading が false になる", async () => {
    mockFetchBacklogItems.mockResolvedValue({ data: [stubItem], error: null });

    const { result } = renderHook(() => useBacklogItems("user-1"), {
      wrapper: TestQueryClientProvider,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([stubItem]);
    expect(result.current.error).toBeNull();
  });

  test("repository がエラーを返した場合は error がセットされ isLoading が false になる", async () => {
    mockFetchBacklogItems.mockResolvedValue({ data: [], error: "fetch failed" });

    const { result } = renderHook(() => useBacklogItems("user-1"), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe("fetch failed");
  });

  test("repository が throw した場合も isLoading が false になりエラーがセットされる", async () => {
    mockFetchBacklogItems.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useBacklogItems("user-1"), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("network error");
    expect(result.current.items).toEqual([]);
  });

  test("loadItems の再呼び出し中も isLoading は false のまま保たれる", async () => {
    mockFetchBacklogItems.mockResolvedValue({ data: [stubItem], error: null });

    const { result } = renderHook(() => useBacklogItems("user-1"), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveNext!: () => void;
    mockFetchBacklogItems.mockReturnValue(
      new Promise((resolve) => {
        resolveNext = () => resolve({ data: [], error: null });
      }),
    );

    void result.current.loadItems();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([stubItem]);

    resolveNext();

    await waitFor(() => expect(result.current.items).toEqual([]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
