import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase.ts";
import { normalizeBacklogItems } from "../data.ts";
import type { BacklogItem } from "../types.ts";

export function useBacklogItems() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("backlog_items")
      .select(
        "id, status, primary_platform, note, sort_order, works(id, title, work_type, source_type, tmdb_id, tmdb_media_type, original_title, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, genres, season_count, season_number, focus_required_score, background_fit_score, completion_load_score)",
      )
      .order("sort_order")
      .order("created_at");

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems(normalizeBacklogItems(data ?? []));
      setError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return { items, setItems, isLoading, error, loadItems };
}
