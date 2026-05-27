const slides = [...document.querySelectorAll(".slide")];
const deck = document.getElementById("deck");
const progressBar = document.getElementById("progress-bar");
const currentSlideEl = document.getElementById("current-slide");
const totalSlidesEl = document.getElementById("total-slides");
const currentTitleEl = document.getElementById("current-title");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

let currentIndex = 0;

totalSlidesEl.textContent = String(slides.length);

function updateSlideState() {
  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === currentIndex);
  });

  currentSlideEl.textContent = String(currentIndex + 1);
  currentTitleEl.textContent = slides[currentIndex].dataset.title || "";
  progressBar.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;

  prevButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === slides.length - 1;
}

function goToSlide(index) {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (nextIndex === currentIndex) return;
  currentIndex = nextIndex;
  updateSlideState();
}

function nextSlide() {
  goToSlide(currentIndex + 1);
}

function previousSlide() {
  goToSlide(currentIndex - 1);
}

function buildPlaceholder(label, src) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-placeholder";
  wrapper.innerHTML = `
    <div>
      <strong>${label}</strong>
      <span>Coloca aqui el archivo esperado para que aparezca en la presentacion.</span>
      <code>${src}</code>
    </div>
  `;
  return wrapper;
}

function attachImage(frame, src, label) {
  const image = document.createElement("img");
  image.className = "loaded-media";
  image.alt = label;

  image.addEventListener("load", () => {
    frame.replaceChildren(image);
  });

  image.addEventListener("error", () => {
    frame.replaceChildren(buildPlaceholder(label, src));
  });

  image.src = src;
}

function attachVideo(frame, src, label) {
  const video = document.createElement("video");
  video.className = "loaded-media";
  video.controls = true;
  video.preload = "metadata";

  video.addEventListener("loadeddata", () => {
    frame.replaceChildren(video);
  });

  video.addEventListener("error", () => {
    frame.replaceChildren(buildPlaceholder(label, src));
  });

  const source = document.createElement("source");
  source.src = src;
  source.type = "video/mp4";
  video.appendChild(source);
  video.load();
}

function hydrateMedia() {
  const frames = document.querySelectorAll(".media-frame");

  frames.forEach((frame) => {
    const src = frame.dataset.src;
    const label = frame.dataset.label || "Archivo pendiente";
    const type = frame.dataset.mediaType;

    if (!src || !type) {
      frame.replaceChildren(buildPlaceholder("Media sin configurar", "Define data-src"));
      return;
    }

    if (type === "image") {
      attachImage(frame, src, label);
      return;
    }

    if (type === "video") {
      attachVideo(frame, src, label);
      return;
    }

    frame.replaceChildren(buildPlaceholder(label, src));
  });
}

prevButton.addEventListener("click", previousSlide);
nextButton.addEventListener("click", nextSlide);

deck.addEventListener("click", (event) => {
  const interactive = event.target.closest("button, video");
  if (interactive) return;
  nextSlide();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
    event.preventDefault();
    nextSlide();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    previousSlide();
    return;
  }
});

hydrateMedia();
updateSlideState();
