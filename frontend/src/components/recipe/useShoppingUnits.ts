import { useEffect, useState } from "react";
import { getUnits } from "../../api/shopping";
import type { UnitOfMeasureDto } from "../../types/shopping";

export function useShoppingUnits(userId: number | null, enabled: boolean) {
  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [pendingVersion, setPendingVersion] = useState(0);
  const [settledVersion, setSettledVersion] = useState(0);

  useEffect(() => {
    if (!enabled || userId == null) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPendingVersion((v) => v + 1);
    });
    void getUnits(userId)
      .then((list) => {
        if (!cancelled) setUnits(list);
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setSettledVersion((v) => v + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return {
    units: enabled ? units : [],
    loadingUnits: enabled && pendingVersion !== settledVersion,
  };
}
