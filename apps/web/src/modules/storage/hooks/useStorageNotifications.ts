import { useEffect } from "react";
import { addToast } from "@heroui/react";
import { shallow } from "zustand/shallow";

import { useStorageStore } from "@/store/storage.store";

export function useStorageNotifications() {
  const { warning, error } = useStorageStore(
    (state) => ({
      warning: state.warning,
      error: state.error
    }),
    shallow
  );

  useEffect(() => {
    if (warning) {
      addToast({ title: "Warning", description: warning, color: "warning" });
    }
  }, [warning]);

  useEffect(() => {
    if (error) {
      addToast({ title: "Error", description: error, color: "danger" });
    }
  }, [error]);
}
