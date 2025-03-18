import { RefObject, useLayoutEffect, useState } from "react";

export const loadSession = (key: string) => {
  const item = window.localStorage.getItem(key);
  return item != null ? item : "";
};

export const unloadSession = () => {
  window.localStorage.removeItem("connection");
  window.localStorage.removeItem("nickname");
  window.localStorage.removeItem("tabCount");
};

export const createSession = (session: { [key: string]: string }) => {
  for (const key in session) {
    window.localStorage.setItem(key, session[key]);
  }
};

export const setSessionItem = (key: string, value: string) => {
  window.localStorage.setItem(key, value);
};

export const getSessionValue = (key: string) => {
  return window.localStorage.getItem(key);
};

export const setRefreshCheck = (session: { [key: string]: string }) => {
  for (const key in session) {
    window.sessionStorage.setItem(key, session[key]);
  }
};

export const getRefreshCheck = (key: string) => {
  const item = window.sessionStorage.getItem(key);
  return item != null ? item : "";
};

export const clearRefreshCheck = () => {
  window.sessionStorage.clear();
};

export const useIsOverflow = (
  ref: RefObject<HTMLDivElement>,
  callback: (hasOverflow: boolean) => void
) => {
  const [isOverflow, setIsOverflow] = useState<boolean | undefined>(undefined);

  useLayoutEffect(() => {
    const { current } = ref;

    const trigger = () => {
      if (current !== null) {
        const hasOverflow =
          current.scrollHeight > current.clientHeight ||
          current.scrollWidth > current.clientWidth;

        setIsOverflow(hasOverflow);

        if (callback) callback(hasOverflow);
      }
    };

    if (current) {
      if ("ResizeObserver" in window) {
        new ResizeObserver(trigger).observe(current);

        trigger();
      }
    }
  }, [callback, ref]);

  return isOverflow;
};
