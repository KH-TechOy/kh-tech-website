import React from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { reportFirebase } from "./firebase";
import { reportError } from "./api";

/** Bounded live query pages. Rebuild downstream cursors when a page boundary moves. */
export function useLivePages<T extends { id: string }>(
  name: string,
  sources: QueryConstraint[][],
  field: string,
  direction: "asc" | "desc",
  pageSize: number,
  pageCount: number,
) {
  const [result, setResult] = React.useState({
    rows: [] as T[],
    more: false,
    error: "",
  });
  React.useEffect(() => {
    let alive = true;
    const stops = new Map<string, () => void>(),
      groups = new Map<string, QueryDocumentSnapshot[]>(),
      tails = new Map<string, string>();
    const publish = (error = "") => {
      if (!alive) return;
      const rows = [
        ...new Map(
          [...groups.values()]
            .flat()
            .map((d) => [d.id, { ...d.data(), id: d.id } as T]),
        ).values(),
      ];
      const more = sources.some((_, i) => {
        const pages = [...groups.keys()]
          .filter((k) => k.startsWith(i + ":"))
          .map((k) => Number(k.split(":")[1]));
        return (
          pages.length &&
          groups.get(i + ":" + Math.max(...pages))?.length === pageSize
        );
      });
      setResult({ rows, more, error });
    };
    function attach(
      source: number,
      page: number,
      cursor?: QueryDocumentSnapshot,
    ) {
      const key = source + ":" + page;
      stops.get(key)?.();
      const constraints = [
        ...sources[source],
        orderBy(field, direction),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(pageSize),
      ];
      stops.set(
        key,
        onSnapshot(
          query(collection(reportFirebase!.db, name), ...constraints),
          (snapshot) => {
            if (!alive) return;
            groups.set(key, snapshot.docs);
            const tail = snapshot.docs[snapshot.docs.length - 1];
            const token = tail
              ? tail.id + ":" + JSON.stringify(tail.data()[field])
              : "";
            if (tails.get(key) !== token) {
              tails.set(key, token);
              for (let next = page + 1; next < pageCount; next++) {
                const downstream = source + ":" + next;
                stops.get(downstream)?.();
                stops.delete(downstream);
                groups.delete(downstream);
                tails.delete(downstream);
              }
              if (tail && snapshot.size === pageSize && page + 1 < pageCount)
                attach(source, page + 1, tail);
            }
            publish();
          },
          (e) => {
            groups.delete(key);
            publish(reportError(e));
          },
        ),
      );
    }
    setResult({ rows: [], more: false, error: "" });
    sources.forEach((_, i) => attach(i, 0));
    return () => {
      alive = false;
      stops.forEach((stop) => stop());
    };
  }, [name, sources, field, direction, pageSize, pageCount]);
  return result;
}
