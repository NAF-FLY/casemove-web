import { useEffect } from "react";

export function useRefetchOnFocus(callback: () => void) {
  useEffect(() => {
    const onFocus = () => {
      callback();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [callback]);
}
