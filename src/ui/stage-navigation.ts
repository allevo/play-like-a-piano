export interface NavPage {
  /** 0 for the intro page, 1..10 for the synthesis stages. */
  index: number;
  shortTitle: string;
}

interface Chip {
  button: HTMLButtonElement;
  titleEl: HTMLElement;
  title: string;
}

/** The 0..10 progress strip. Titles of not-yet-reached sections stay hidden so
 *  the audience gets no preview of what is coming next. */
export class StageNavigation {
  private readonly chips = new Map<number, Chip>();

  constructor(
    container: HTMLElement,
    pages: NavPage[],
    onSelect: (index: number) => void,
  ) {
    container.replaceChildren();

    for (const page of pages) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stage-chip";
      button.innerHTML =
        `<span class="stage-chip-index">${page.index}</span>` +
        `<span class="stage-chip-title"></span>`;
      const titleEl = button.querySelector<HTMLElement>(".stage-chip-title");
      if (!titleEl) continue;

      button.addEventListener("click", () => onSelect(page.index));
      container.append(button);
      this.chips.set(page.index, { button, titleEl, title: page.shortTitle });
    }
  }

  setActive(index: number): void {
    this.chips.forEach((chip, i) => {
      const active = i === index;
      chip.button.classList.toggle("is-active", active);
      // Not colour alone: the active chip is also marked for assistive tech.
      chip.button.setAttribute("aria-current", active ? "step" : "false");

      // Reveal a title only once its section has been reached.
      const revealed = i <= index;
      chip.button.classList.toggle("is-locked", !revealed);
      chip.titleEl.textContent = revealed ? chip.title : "";
    });
  }
}
