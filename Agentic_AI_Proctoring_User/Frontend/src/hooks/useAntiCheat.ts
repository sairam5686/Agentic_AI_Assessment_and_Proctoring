import { useEffect } from 'react';

/**
 * useAntiCheat
 * Blocks the following for the entire assessment session:
 *  - Copy / Cut / Paste (keyboard + context menu)
 *  - Right-click context menu
 *  - View Source (Ctrl+U)
 *  - DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
 *  - New Tab / New Window (Ctrl+T, Ctrl+N)
 *  - Text selection
 *
 * All listeners are removed automatically when the component unmounts.
 */
export function useAntiCheat() {
  useEffect(() => {
    // ── Blocked key combos ──────────────────────────────────────────────────
    const BLOCKED_KEYS: { key: string; ctrl?: boolean; shift?: boolean }[] = [
      // Copy / Cut / Paste / Select All
      { key: 'c', ctrl: true },
      { key: 'x', ctrl: true },
      { key: 'v', ctrl: true },
      { key: 'a', ctrl: true },
      // Dev Tools
      { key: 'F12' },
      { key: 'i', ctrl: true, shift: true },
      { key: 'j', ctrl: true, shift: true },
      { key: 'c', ctrl: true, shift: true },
      // View Source
      { key: 'u', ctrl: true },
      // New Tab / New Window
      { key: 't', ctrl: true },
      { key: 'n', ctrl: true },
      // Print / Save
      { key: 'p', ctrl: true },
      { key: 's', ctrl: true },
      // Find
      { key: 'f', ctrl: true },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      const matched = BLOCKED_KEYS.some((rule) => {
        const keyMatch = e.key.toLowerCase() === rule.key.toLowerCase();
        const ctrlMatch = rule.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = rule.shift ? e.shiftKey : true;
        return keyMatch && ctrlMatch && shiftMatch;
      });

      if (matched) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // ── Block right-click ───────────────────────────────────────────────────
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // ── Block copy / cut / paste events ────────────────────────────────────
    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // ── Block text selection ────────────────────────────────────────────────
    const handleSelectStart = (e: Event) => {
      // Allow selection inside input / textarea / contenteditable
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      e.preventDefault();
    };

    // ── Register all listeners ──────────────────────────────────────────────
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('copy', handleClipboard, true);
    document.addEventListener('cut', handleClipboard, true);
    document.addEventListener('paste', handleClipboard, true);
    document.addEventListener('selectstart', handleSelectStart, true);

    // ── CSS: disable text selection globally ────────────────────────────────
    const style = document.createElement('style');
    style.id = 'anti-cheat-style';
    style.textContent = `
      body * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('copy', handleClipboard, true);
      document.removeEventListener('cut', handleClipboard, true);
      document.removeEventListener('paste', handleClipboard, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.getElementById('anti-cheat-style')?.remove();
    };
  }, []);
}
