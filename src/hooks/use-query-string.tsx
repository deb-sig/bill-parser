import { useMemo } from 'react';

const useQueryString = <T extends Record<string, string>>(): T => {
  return useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
    return query as T;
  }, []);
};

export default useQueryString;
