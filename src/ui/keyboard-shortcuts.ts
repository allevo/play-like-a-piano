export interface ShortcutHandlers {
  previous(): void;
  next(): void;
  togglePlay(): void;
}

/** True while the presenter is inside a slider or a text field. */
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function installKeyboardShortcuts(handlers: ShortcutHandlers): void {
  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const editing = isEditing(event.target);

    // Space must work everywhere, but it would otherwise also "click" whatever
    // button has focus — preventDefault stops the note from firing twice.
    if (event.code === "Space") {
      event.preventDefault();
      handlers.togglePlay();
      return;
    }

    // Arrows belong to the slider while a slider has focus.
    if (editing) return;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        handlers.previous();
        break;
      case "ArrowRight":
        event.preventDefault();
        handlers.next();
        break;
      default:
        break;
    }
  });
}
