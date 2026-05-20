import { useEffect, useState } from "react";
import { getUnits } from "../../api/shopping";
import type { UnitOfMeasureDto } from "../../types/shopping";

export function useShoppingUnits(enabled: boolean) {
  const [units, setUnits] = useState<UnitOfMeasureDto[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    setLoadingUnits(true);
    void getUnits()
      .then((list) => {
        if (!cancelled) setUnits(list);
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUnits(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { units, loadingUnits };
}
