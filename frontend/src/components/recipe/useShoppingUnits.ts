import { useEffect, useState } from "react";
import { getUnits } from "../../api/shopping";
import type { UnitOfMeasureDto } from "../../types/shopping";

export function useShoppingUnits(enabled: boolean) {
  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [pendingVersion, setPendingVersion] = useState(0);
  const [settledVersion, setSettledVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPendingVersion((v) => v + 1);
    });
    void getUnits()
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
  }, [enabled]);

  return {
    units: enabled ? units : [],
    loadingUnits: enabled && pendingVersion !== settledVersion,
  };
}
