import { useEffect, useState } from 'react';

const NON_TEXT_INPUT_TYPES = new Set([
  'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit',
]);

/** True when the element brings up the on-screen keyboard when focused. */
const isEditable = (el) => {
  if (!el || el === document.body) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return !el.readOnly && !el.disabled;
  if (tag === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.has((el.type || 'text').toLowerCase()) && !el.readOnly && !el.disabled;
  }
  return false;
};

// How much the visible viewport must shrink before we treat it as a keyboard
const KEYBOARD_MIN_HEIGHT = 120;

/**
 * Detects whether the mobile on-screen keyboard is open.
 *
 * A text field must be focused AND the visual viewport must have shrunk
 * (compared with its tallest height at the current width). Requiring both
 * avoids false positives on desktop and handles the Android back button,
 * which closes the keyboard but leaves the field focused. Browsers without
 * `visualViewport` fall back to "a text field is focused".
 */
export function useKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    let baselineHeight = vv ? vv.height : window.innerHeight;
    let baselineWidth = vv ? vv.width : window.innerWidth;
    let raf = 0;

    const evaluate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const focused = isEditable(document.activeElement);
        if (!vv) {
          setIsOpen(focused);
          return;
        }
        // Reset the baseline when the width changes (rotation / resize)
        if (Math.abs(vv.width - baselineWidth) > 1) {
          baselineWidth = vv.width;
          baselineHeight = vv.height;
        }
        if (!focused || vv.height > baselineHeight) baselineHeight = Math.max(baselineHeight, vv.height);
        setIsOpen(focused && baselineHeight - vv.height > KEYBOARD_MIN_HEIGHT);
      });
    };

    document.addEventListener('focusin', evaluate);
    document.addEventListener('focusout', evaluate);
    vv?.addEventListener('resize', evaluate);
    window.addEventListener('resize', evaluate);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('focusin', evaluate);
      document.removeEventListener('focusout', evaluate);
      vv?.removeEventListener('resize', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, []);

  return isOpen;
}

export default useKeyboardOpen;
