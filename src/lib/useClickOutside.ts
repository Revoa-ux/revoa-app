import { useEffect, RefObject } from 'react';

/**
 * Hook that handles click outside of the specified element
 * @param ref Reference to the element to detect clicks outside of
 * @param handler Function to call when a click outside is detected
 * @param excludeRefs Optional array of refs to exclude from triggering the handler
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  excludeRefs: RefObject<HTMLElement>[] = []
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      // Do nothing if clicking any of the excluded elements
      for (const excludeRef of excludeRefs) {
        if (excludeRef.current && excludeRef.current.contains(target)) {
          return;
        }
      }

      handler(event);
    };

    // Use capture phase to ensure this runs before other click handlers
    document.addEventListener('mousedown', listener, true);
    document.addEventListener('touchstart', listener, true);

    // Add escape key handler
    const escapeListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler(event as unknown as MouseEvent);
      }
    };

    document.addEventListener('keydown', escapeListener);

    return () => {
      document.removeEventListener('mousedown', listener, true);
      document.removeEventListener('touchstart', listener, true);
      document.removeEventListener('keydown', escapeListener);
    };
  }, [ref, handler, excludeRefs]);
}