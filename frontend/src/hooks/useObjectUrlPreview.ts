import { useEffect, useMemo } from "react";

/** Object URL for a local File; revoked on change/unmount. */
export function useObjectUrlPreview(file: File | null | undefined): string | null {
  const url = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}
