import { useCallback, useRef, useState } from 'react';

/**
 * Errors for one form: set all at once when it is submitted, cleared field by field as they are fixed.
 * After a failed submit the first invalid control gets focus, so a keyboard or screen-reader user lands on the problem.
 * Put `formRef` on the <form> and `noValidate` on it, so these messages show instead of the browser's bubbles.
 */
export function useFormErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const clear = useCallback((key: K) => {
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _gone, ...rest } = e;
      return rest as Partial<Record<K, string>>;
    });
  }, []);

  /** Pass each field's check result (a message, or null). Returns true when everything is fine. */
  const validate = useCallback((checks: Partial<Record<K, string | null | false | undefined>>) => {
    const found = Object.fromEntries(Object.entries(checks).filter(([, message]) => Boolean(message))) as Partial<Record<K, string>>;
    setErrors(found);
    if (Object.keys(found).length === 0) return true;
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    return false;
  }, []);

  return { errors, clear, validate, formRef };
}

/** "Wajib diisi." for an empty value, otherwise null. */
export const required = (value: string | null | undefined, what = 'Kolom ini') => (value && value.trim() ? null : `${what} wajib diisi.`);
