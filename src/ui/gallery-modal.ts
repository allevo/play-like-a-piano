import type { StageGallery } from "../stages/types.ts";

/**
 * A modal image carousel built on the native <dialog> element, so Esc-to-close,
 * the backdrop and focus trapping come for free. One gallery is shown at a time;
 * open() swaps in a new set of images and resets to the first.
 */
export class GalleryModal {
  private readonly dialog: HTMLDialogElement;
  private readonly titleEl: HTMLElement;
  private readonly imageEl: HTMLImageElement;
  private readonly captionEl: HTMLElement;
  private readonly counterEl: HTMLElement;
  private readonly dotsEl: HTMLElement;
  private readonly prevButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;

  private images: StageGallery["images"] = [];
  private current = 0;

  constructor(dialog: HTMLDialogElement) {
    this.dialog = dialog;
    dialog.classList.add("gallery-modal");
    dialog.innerHTML =
      `<div class="gallery-head">` +
      `<h3 class="gallery-title"></h3>` +
      `<button type="button" class="button gallery-close" aria-label="Chiudi">✕</button>` +
      `</div>` +
      `<div class="gallery-stage">` +
      `<button type="button" class="gallery-arrow gallery-prev" aria-label="Immagine precedente">‹</button>` +
      `<img class="gallery-image" alt="" />` +
      `<button type="button" class="gallery-arrow gallery-next" aria-label="Immagine successiva">›</button>` +
      `</div>` +
      `<p class="gallery-caption"></p>` +
      `<div class="gallery-footer">` +
      `<div class="gallery-dots"></div>` +
      `<span class="gallery-counter"></span>` +
      `</div>`;

    this.titleEl = this.query(".gallery-title");
    this.imageEl = this.query<HTMLImageElement>(".gallery-image");
    this.captionEl = this.query(".gallery-caption");
    this.counterEl = this.query(".gallery-counter");
    this.dotsEl = this.query(".gallery-dots");
    this.prevButton = this.query<HTMLButtonElement>(".gallery-prev");
    this.nextButton = this.query<HTMLButtonElement>(".gallery-next");

    this.prevButton.addEventListener("click", () => this.step(-1));
    this.nextButton.addEventListener("click", () => this.step(1));
    this.query<HTMLButtonElement>(".gallery-close").addEventListener(
      "click",
      () => dialog.close(),
    );

    // Click on the backdrop (outside the dialog content) closes it.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    // Arrow keys page through the carousel while it is open. This listener is on
    // the dialog, so it never fires for the app-wide shortcuts behind the modal.
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.step(1);
      }
    });
  }

  open(gallery: StageGallery): void {
    this.images = gallery.images;
    this.current = 0;
    this.titleEl.textContent = gallery.title;

    this.dotsEl.replaceChildren();
    this.images.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot";
      dot.setAttribute("aria-label", `Immagine ${i + 1}`);
      dot.addEventListener("click", () => this.show(i));
      this.dotsEl.append(dot);
    });

    this.show(0);
    this.dialog.showModal();
  }

  private step(delta: number): void {
    const count = this.images.length;
    if (count === 0) return;
    this.show((this.current + delta + count) % count);
  }

  private show(index: number): void {
    const image = this.images[index];
    if (!image) return;
    this.current = index;

    this.imageEl.src = image.src;
    this.captionEl.textContent = image.caption;
    this.counterEl.textContent = `${index + 1} / ${this.images.length}`;

    this.dotsEl.querySelectorAll(".gallery-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
    });
  }

  private query<T extends HTMLElement>(selector: string): T {
    const found = this.dialog.querySelector<T>(selector);
    if (!found) throw new Error(`Missing gallery element ${selector}`);
    return found;
  }
}
