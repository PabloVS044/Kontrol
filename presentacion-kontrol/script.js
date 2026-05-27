const slides = [...document.querySelectorAll(".slide")];
const deck = document.getElementById("deck");

let currentIndex = 0;

const videoControllers = new Map();

function updateSlideState() {
  slides.forEach((slide, index) => {
    const isActive = index === currentIndex;
    slide.classList.toggle("is-active", isActive);

    const controller = videoControllers.get(index);
    if (controller) {
      if (isActive) {
        controller.activate();
      } else {
        controller.deactivate();
      }
    }
  });
}

function goToSlide(index) {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (nextIndex === currentIndex) return;
  currentIndex = nextIndex;
  updateSlideState();
}

function nextSlide() { goToSlide(currentIndex + 1); }
function previousSlide() { goToSlide(currentIndex - 1); }

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

function createVideo() {
  const v = document.createElement("video");
  v.className = "loaded-media";
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  return v;
}

// Mount video into frame on first canplay
function mountVideo(frame, video) {
  video.addEventListener("canplay", function onFirstCanplay() {
    video.removeEventListener("canplay", onFirstCanplay);
    frame.replaceChildren(video);
  });
}

// Play when ready: if already has data, play now; otherwise wait for canplay
function playWhenReady(video, getActive) {
  if (video.readyState >= 2) {
    if (getActive()) video.play().catch(() => {});
  } else {
    video.addEventListener("canplay", function onCanplay() {
      video.removeEventListener("canplay", onCanplay);
      if (getActive()) video.play().catch(() => {});
    });
  }
}

function attachVideoSingle(frame, src, label, slideIndex) {
  const video = createVideo();
  video.loop = true;
  video.src = src;

  mountVideo(frame, video);

  videoControllers.set(slideIndex, {
    activate() {
      video.currentTime = 0;
      video.play().catch(() => {});
    },
    deactivate() {
      video.pause();
    },
  });
}

function attachVideoSequence(frame, srcs, label, slideIndex) {
  let idx = 0;
  let active = false;

  const video = createVideo();
  video.src = srcs[0];

  mountVideo(frame, video);

  video.addEventListener("ended", () => {
    if (!active) return;
    idx = (idx + 1) % srcs.length;
    video.src = srcs[idx];
    // Wait for data before playing — avoids spurious errors on src change
    video.addEventListener("canplay", function onNext() {
      video.removeEventListener("canplay", onNext);
      if (active) video.play().catch(() => {});
    });
  });

  videoControllers.set(slideIndex, {
    activate() {
      active = true;
      idx = 0;
      video.currentTime = 0;
      // If src changed while inactive, reset to first
      if (!video.src.endsWith(srcs[0].replace(/^.*\//, ""))) {
        video.src = srcs[0];
      }
      playWhenReady(video, () => active);
    },
    deactivate() {
      active = false;
      video.pause();
    },
  });
}

function hydrateMedia() {
  document.querySelectorAll(".media-frame[data-media-type]").forEach((frame) => {
    const type = frame.dataset.mediaType;
    const label = frame.dataset.label || "Archivo pendiente";
    const slide = frame.closest(".slide");
    const slideIndex = slides.indexOf(slide);

    if (type === "video") {
      const videosAttr = frame.dataset.videos;

      if (videosAttr) {
        try {
          const srcs = JSON.parse(videosAttr);
          if (srcs.length === 1) {
            attachVideoSingle(frame, srcs[0], label, slideIndex);
          } else {
            attachVideoSequence(frame, srcs, label, slideIndex);
          }
        } catch {
          frame.replaceChildren(buildPlaceholder(label, videosAttr));
        }
        return;
      }

      const src = frame.dataset.src;
      if (src) {
        attachVideoSingle(frame, src, label, slideIndex);
        return;
      }

      frame.replaceChildren(buildPlaceholder("Video sin configurar", "Define data-src o data-videos"));
      return;
    }

    if (type === "image") {
      const src = frame.dataset.src;
      if (!src) {
        frame.replaceChildren(buildPlaceholder(label, "Define data-src"));
        return;
      }
      const image = document.createElement("img");
      image.className = "loaded-media";
      image.alt = label;
      image.addEventListener("load", () => { frame.replaceChildren(image); });
      image.addEventListener("error", () => { frame.replaceChildren(buildPlaceholder(label, src)); });
      image.src = src;
    }
  });
}

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
