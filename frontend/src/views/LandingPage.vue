<template>
  <main data-theme="dark">
    <!-- Fixed background video, scrubbed by total page scroll (see
         setupBackgroundVideoScrub): frame 0 = fully chaotic, last frame =
         fully ordered, so scrolling from Header to Start visually traces the
         same "chaos becomes order" arc the copy already tells. Paused by
         default — only ever seeked via JS, never auto-playing on its own.
         `v-if` (not a CSS `display: none`) on mobile: it's a multi-MB file
         and the browser starts fetching it the moment the tag exists in the
         DOM, so it has to never be there at all rather than be hidden after
         the fact. The backdrop below it hides the app's Waves background
         (App.vue), which otherwise showed through the dimmed video; on
         mobile, with no video, the Waves stay as on every other page. -->
    <div v-if="!isMobile" class="bg-scroll-video-backdrop" aria-hidden="true"></div>
    <video
      v-if="!isMobile"
      ref="bgVideoRef"
      class="bg-scroll-video"
      src="/kontrol-scroll-chaos-order.mp4"
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
    ></video>
    <div v-if="!isMobile" class="bg-scroll-video-scrim" aria-hidden="true"></div>

    <Navbar />
    <section id="header">
      <div class="header-container">
        <Pill
          :label="t('landing.hero.pill')"
          btnColor="var(--k-color-pill-back)"
          circleColor="var(--k-color-primary)"
          textColor="var(--k-color-primary)"
        />
        <AnimatedText
          style="margin-top: 0"
          :effects="reduceMotion ? 'shiny' : 'split shiny'"
          :text="t('landing.hero.title')"
          tag="h1"
          class="hero-title"
          color="var(--k-color-primary)"
          shine-color="var(--k-color-text)"
          :speed="5"
          :delay="2.4"
          :spread="135"
          direction="left"
          :yoyo="false"
          :pause-on-hover="false"
          :disabled="reduceMotion"
          :split-delay="12"
          :duration="0.45"
          ease="power3.out"
          :from="{ opacity: 0, y: 40 }"
          :to="{ opacity: 1, y: 0 }"
        />
        <p>{{ t('landing.hero.copy') }}</p>

        <div class="goto">
          <Anchor
            :label="t('landing.hero.start')"
            backColor="var(--k-color-primary)"
            hoverColor="var(--k-color-tertiary)"
            :icon="arrowRightIcon"
            link="/register"
          />
          <Anchor
            :label="t('landing.hero.seeHow')"
            backColor="var(--k-color-tertiary)"
            hoverColor="var(--k-color-secondary)"
            :icon="arrowRightIcon"
            link="#steps"
          />
        </div>
      </div>
    </section>

    <!-- Pilot: a single fixed viewport where the K stays put while the scroll
         drives it through three "moments" — see setupControlCenter(). If this
         works well, the same pin+scrub pattern extends to the rest of the
         page; if not, it's isolated here and easy to remove. -->
    <section id="control-center" :class="{ 'no-pin': reduceMotion || isMobile }">
      <div class="control-center-viewport" ref="controlViewportRef">
        <div class="control-k-wrapper" aria-hidden="true" ref="controlKRef">
          <KontrolLogo3D
            width="380px"
            height="380px"
            :idle-spin-speed="reduceMotion ? 0 : 0.04"
            :scroll-rotation-y="scrollK.rotationY"
            :scroll-scale="scrollK.scale"
          />
        </div>

        <!-- What the platform does comes first, right after the hero's
             "take control" promise; "one command center" then sums it up. -->
        <div class="control-moment control-moment-1" ref="controlMoment1Ref">
          <h2 class="sub-title">{{ t('landing.control.every') }}</h2>
          <ul class="control-modules">
            <li v-for="mod in controlModules" :key="mod.key" class="control-module">
              <component :is="mod.icon" :size="22" class="control-module-icon" aria-hidden="true" />
              <div>
                <h3 class="control-module-title">{{ t(`landing.control.modules.${mod.key}.title`) }}</h3>
                <p class="control-module-copy">{{ t(`landing.control.modules.${mod.key}.copy`) }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="control-moment control-moment-2" ref="controlMoment2Ref">
          <h2 class="sub-title">{{ t('landing.control.one') }}</h2>
        </div>

        <div class="control-moment control-moment-3" ref="controlMoment3Ref">
          <h2 class="sub-title">{{ t('landing.control.yours') }}</h2>
        </div>
      </div>
    </section>

    <!-- Pinned like #control-center: the heading stays put while scroll
         morphs "The Chaos" into "The Order" in the same spot — see
         setupProblemPin(). -->
    <section id="problem" :class="{ 'no-pin': reduceMotion || isMobile }">
      <div class="problem-viewport">
        <h2 class="sub-title">
          {{ t('landing.problem.titleStart') }}
          <span class="marked">{{ t('landing.problem.titleMark') }}</span>
        </h2>

        <div class="problem-stage">
          <div class="problem-card-wrap" ref="chaosWrapRef">
            <Card
              :title="t('landing.problem.chaos.title')"
              :subtitle="t('landing.problem.chaos.subtitle')"
              :icon="LayoutGrid"
              :iconSize="48"
              iconColor="var(--k-color-bg-3)"
              :listIcon="CircleX"
              :listIconSize="24"
              listIconColor="var(--k-color-error)"
              :characteristics="chaosCharacteristics"
              back="var(--k-color-tertiary)"
              borderColor="var(--k-color-border)"
              titleColor="var(--k-color-text)"
            />
          </div>

          <div class="problem-card-wrap" ref="orderWrapRef">
            <Card
              :title="t('landing.problem.order.title')"
              :subtitle="t('landing.problem.order.subtitle')"
              :icon="Sparkles"
              :iconSize="48"
              iconColor="var(--k-color-primary-2)"
              :listIcon="CircleCheck"
              :listIconSize="24"
              listIconColor="var(--k-color-success)"
              :characteristics="orderCharacteristics"
              back="var(--k-color-bg-2)"
              borderColor="var(--k-color-border)"
              titleColor="var(--k-color-primary-2)"
              shadowColor="var(--k-color-border)"
            />
          </div>
        </div>
      </div>
    </section>

    <section id="solution">
      <div class="solution-container">
        <h2 class="sub-title">{{ t('landing.solution.title') }}</h2>
        <p class="description">{{ t('landing.solution.copy') }}</p>
        <div class="magic-circles-wrapper">
          <MagicCircles
            color="var(--k-color-primary-2)"
            color-two="var(--k-color-primary)"
            :ring-count="6"
            :speed="1"
            :attenuation="10"
            :line-thickness="2"
            :base-radius="0.35"
            :radius-step="0.1"
            :scale-rate="0.1"
            :opacity="1"
            :blur="0"
            :noise-amount="0.1"
            :rotation="0"
            :ring-gap="1.5"
            :fade-in="0.7"
            :fade-out="0.5"
            :follow-mouse="false"
            :mouse-influence="0.2"
            :hover-scale="1.2"
            :parallax="0.05"
            :click-burst="false"
            :background="`linear-gradient(color-mix(in srgb, var(--k-color-bg) 90%, transparent), color-mix(in srgb, var(--k-color-tertiary) 80%, transparent))`"
          />
          <div class="graph">
            <CircleRounded
              :size="200"
              color="var(--k-color-primary)"
              roundedColor="var(--k-color-primary-2)"
              :animationDuration="3"
              :icon="NetworkIcon"
              class="main-circle"
            />
            <Card
              class="sub-1"
              :title="t('landing.solution.finances.title')"
              :subtitle="t('landing.solution.finances.subtitle')"
              :icon="Banknote"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-2"
              :title="t('landing.solution.crm.title')"
              :subtitle="t('landing.solution.crm.subtitle')"
              :icon="UsersRound"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-3"
              :title="t('landing.solution.marketing.title')"
              :subtitle="t('landing.solution.marketing.subtitle')"
              :icon="Megaphone"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-4"
              :title="t('landing.solution.inventory.title')"
              :subtitle="t('landing.solution.inventory.subtitle')"
              :icon="Box"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
          </div>
        </div>
      </div>
    </section>

    <section id="features">
      <h2 class="sub-title">{{ t('landing.features.title') }}</h2>
      <p class="description">{{ t('landing.features.copy') }}</p>
      <MagicBento
        :text-auto-hide="true"
        enable-stars
        enable-spotlight
        :enable-border-glow="true"
        :enable-tilt="false"
        :enable-magnetism="false"
        click-effect
        :spotlight-radius="400"
        :particle-count="12"
        :disable-animations="reduceMotion"
        card-background="var(--k-color-bg-2)"
        card-border="var(--k-color-border)"
        label-color="var(--k-color-primary)"
        title-color="var(--k-color-text)"
        description-color="var(--k-color-text)"
        glow-color="var(--k-color-primary)"
        :cards="featureCards"
      />
    </section>

    <section id="steps">
      <h2 class="sub-title">{{ t('landing.steps.title') }}</h2>
      <ScrollStack
        :use-window-scroll="true"
        :item-distance="50"
        :item-stack-distance="30"
        stack-position="center"
        :base-scale="0.85"
      >
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :badge="t('landing.steps.badge', { n: 1 })"
          :title="t('landing.steps.connect.title')"
          :description="t('landing.steps.connect.description')"
          :process="listOf('landing.steps.connect.process')"
        />
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :badge="t('landing.steps.badge', { n: 2 })"
          :title="t('landing.steps.automate.title')"
          :description="t('landing.steps.automate.description')"
          :process="listOf('landing.steps.automate.process')"
        />
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :badge="t('landing.steps.badge', { n: 3 })"
          :title="t('landing.steps.optimize.title')"
          :description="t('landing.steps.optimize.description')"
          :process="listOf('landing.steps.optimize.process')"
        />
      </ScrollStack>
    </section>

    <section id="companies">
      <div class="companies-wrapper">
        <div class="steps-header">
          <h2 class="sub-title">{{ t('landing.companies.title') }}</h2>
          <p>{{ t('landing.companies.copy') }}</p>
        </div>
        <div class="companies-swap">
        <CardSwap
          :width="cardSwapWidth"
          :height="cardSwapHeight"
          :card-distance="cardDistance"
          :vertical-distance="verticalDistance"
          :delay="5000"
          easing="elastic"
        >
          <CarSwapItem
            class="card-inner"
            style="
              background: linear-gradient(
                135deg,
                var(--k-color-tertiary),
                var(--k-color-bg)
              );
            "
          >
            <div class="swap-card-content">
              <span class="swap-card-tag">{{ t('landing.companies.store.tag') }}</span>
              <h3 class="swap-card-title">{{ t('landing.companies.store.title') }}</h3>
              <p class="swap-card-description">{{ t('landing.companies.store.copy') }}</p>
              <ul class="swap-card-list">
                <li v-for="item in listOf('landing.companies.store.items')" :key="item">{{ item }}</li>
              </ul>
            </div>
          </CarSwapItem>
          <CarSwapItem
            class="card-inner"
            style="
              background: linear-gradient(
                135deg,
                var(--k-color-tertiary),
                var(--k-color-bg)
              );
            "
          >
            <div class="swap-card-content">
              <span class="swap-card-tag">{{ t('landing.companies.auto.tag') }}</span>
              <h3 class="swap-card-title">{{ t('landing.companies.auto.title') }}</h3>
              <p class="swap-card-description">{{ t('landing.companies.auto.copy') }}</p>
              <ul class="swap-card-list">
                <li v-for="item in listOf('landing.companies.auto.items')" :key="item">{{ item }}</li>
              </ul>
            </div>
          </CarSwapItem>
          <CarSwapItem
            class="card-inner"
            style="
              background: linear-gradient(
                135deg,
                var(--k-color-tertiary),
                var(--k-color-bg)
              );
            "
          >
            <div class="swap-card-content">
              <span class="swap-card-tag">{{ t('landing.companies.food.tag') }}</span>
              <h3 class="swap-card-title">{{ t('landing.companies.food.title') }}</h3>
              <p class="swap-card-description">{{ t('landing.companies.food.copy') }}</p>
              <ul class="swap-card-list">
                <li v-for="item in listOf('landing.companies.food.items')" :key="item">{{ item }}</li>
              </ul>
            </div>
          </CarSwapItem>
        </CardSwap>
        </div>
      </div>
    </section>
    <section id="start">
      <h2 class="sub-title">{{ t('landing.start.title') }}</h2>
      <p>{{ t('landing.start.copy') }}</p>
      <Anchor
        :label="t('landing.start.cta')"
        backColor="var(--k-color-primary-2)"
        hoverColor="var(--k-color-tertiary)"
        :icon="Rocket"
        link = "/register"
      />
    </section>
    <Footer />
  </main>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger);

const { t, tm, rt } = useI18n();
import MagicBento from "../components/UI/AnimatedComponents/MagicBento.vue";
import Navbar from "../components/Navbar.vue";
import Footer from "../components/Footer.vue";
import AnimatedText from "../components/UI/TextEffects/AnimatedText.vue";
import Pill from "../components/UI/Pill/Pill.vue";
import Anchor from "../components/UI/Button/Anchor.vue";
import arrowRightIcon from "../assets/img/arrow-right.png";
import Card from "../components/UI/Card/Card.vue";
import {
  LayoutGrid,
  Sparkles,
  Boxes,
  ShoppingCart,
  Truck,
  Wallet,
  FileBarChart,
  FolderKanban,
  MessagesSquare,
  Bot,
  CircleX,
  CircleCheck,
  NetworkIcon,
  Banknote,
  UsersRound,
  Megaphone,
  Box,
  BarChart2,
  LayoutDashboard,
  Users,
  Zap,
  Puzzle,
  ShieldCheck,
  Rocket,
} from "lucide-vue-next";

import MagicCircles from "../components/UI/Backgrounds/MagicCircles/LazyMagicCircles.vue";
import CircleRounded from "../components/UI/CircleRounded/CircleRounded.vue";
import ScrollStack from "../components/UI/AnimatedComponents/ScrollStack.vue";
import ScrollStackItem from "../components/UI/AnimatedComponents/ScrollStackItem.vue";
import CardSwap from "../components/UI/AnimatedComponents/CardsSwap.vue";
import CarSwapItem from "../components/UI/AnimatedComponents/CarSwapItem.vue";
import KontrolLogo3D from "../components/UI/KontrolLogo3D/KontrolLogo3D.vue";

// ─── Responsive CardSwap sizing ───────────────────────────────────────────────
const cardSwapWidth = ref(860);
const cardSwapHeight = ref(620);
const cardDistance = ref(60);
const verticalDistance = ref(70);

function updateCardSwapSize() {
  const vw = window.innerWidth;
  if (vw < 480) {
    cardSwapWidth.value = Math.min(340, vw - 40);
    cardSwapHeight.value = 300;
    cardDistance.value = 25;
    verticalDistance.value = 35;
  } else if (vw < 768) {
    cardSwapWidth.value = Math.min(480, vw - 60);
    cardSwapHeight.value = 380;
    cardDistance.value = 35;
    verticalDistance.value = 45;
  } else if (vw < 1024) {
    cardSwapWidth.value = 620;
    cardSwapHeight.value = 480;
    cardDistance.value = 50;
    verticalDistance.value = 60;
  } else {
    cardSwapWidth.value = 860;
    cardSwapHeight.value = 620;
    cardDistance.value = 65;
    verticalDistance.value = 75;
  }
}

function handleLandingResize() {
  updateCardSwapSize();
}

// ─── Scroll choreography ────────────────────────────────────────────────────
// Each section gets its own entrance signature, tied to the scroll position —
// this is what makes the page feel animated as you scroll rather than static
// content that just happens to be below the fold.
const landingScrollTriggers = [];

// `scrub` instead of a one-shot `toggleActions` trigger: the reveal's
// progress is tied directly to scroll position within its own window (like
// the background video, Solution, Problem, and Control Center already are),
// so content visibly draws itself in exactly as fast or slow as you scroll —
// pausing mid-scroll pauses the reveal too — rather than a fixed-duration
// animation that just fires once you cross a line.
function revealOnScroll(target, fromVars, triggerVars = {}) {
  if (!target || (Array.isArray(target) && !target.length)) return;
  const tween = gsap.from(target, {
    ease: "none",
    // Otherwise GSAP leaves the tween's final transform/opacity as an inline
    // style forever, which outranks CSS `:hover` rules (e.g. Card.css's lift
    // on hover) — clearProps only fires once scrub reaches the end of its
    // window, and GSAP re-applies the value the moment you scroll back into
    // it, so the reveal still works both ways.
    clearProps: "transform,opacity,filter",
    ...fromVars,
    scrollTrigger: {
      trigger: Array.isArray(target) ? target[0] : target,
      start: "top 85%",
      end: "+=380",
      scrub: 0.3,
      ...triggerVars,
    },
  });
  if (tween.scrollTrigger) landingScrollTriggers.push(tween.scrollTrigger);
}

// ─── Background scroll video: total page scroll (0 → 1, Header through the
// Footer) maps to the video's own timeline (0 → duration). The source clip
// is only ~4s of actual generated content (AI video credits are expensive);
// it's motion-interpolated up to ~8s of smooth slow motion locally (see the
// ffmpeg step that produced public/kontrol-scroll-chaos-order.mp4) so there's
// more real seekable duration without paying for more generation. Spread
// across the whole page this will still move less per scroll-pixel than the
// earlier bounded-window version did — if that reads as sluggish again,
// the fix is more of the same free lever (stretch the clip further), not
// re-shrinking the window. Reduced motion leaves it paused on its first
// (most chaotic) frame instead. ─────────────────────────────────────────────
const bgVideoRef = ref(null);

function setupBackgroundVideoScrub() {
  const video = bgVideoRef.value;
  if (!video) return;

  video.pause();
  if (reduceMotion.value) return;

  const fadeIn = gsap.to(video, {
    opacity: 1,
    ease: "none",
    scrollTrigger: { trigger: "#header", start: "top top", end: "bottom top", scrub: true },
  });
  landingScrollTriggers.push(fadeIn.scrollTrigger);

  const wireScrub = () => {
    if (!video.duration) return;
    // Seeking to exactly `video.duration` lands past the last decodable
    // frame in most browsers and renders nothing (black/blank) instead of
    // holding the final frame — which is what read as the video "ending"
    // and leaving empty space once scroll passed this section. Capping the
    // target just short of the real duration keeps it parked on an actual
    // visible frame instead.
    const seekableDuration = Math.max(0, video.duration - 0.15);
    const st = ScrollTrigger.create({
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        // A hard `video.currentTime =` assignment on every tick can outpace
        // what the decoder can seek to, which is what read as the video
        // "getting stuck" — tweening it instead smooths out fast scroll
        // bursts into a short catch-up motion rather than a forced jump.
        // "auto" (not `true`) so it only replaces the previous currentTime
        // tween and leaves the opacity fade-in above alone.
        gsap.to(video, {
          currentTime: self.progress * seekableDuration,
          duration: 0.2,
          ease: "none",
          overwrite: "auto",
        });
      },
    });
    landingScrollTriggers.push(st);
  };

  if (video.readyState >= 1) wireScrub();
  else video.addEventListener("loadedmetadata", wireScrub, { once: true });
}

// Computed synchronously (not in onMounted) because it gates whether the
// background <video> even renders — deciding that after mount would mean the
// browser already started fetching a multi-MB file before we could pull it
// back. Matches the same 768px breakpoint the CSS media queries use for the
// mobile layout. Not re-evaluated on resize/rotate.
const isMobile = ref(window.matchMedia("(max-width: 768px)").matches);
// Also read up front: the hero title and the 3D K take it as props on their
// first render, so reading it after mount would let them start animating.
const reduceMotion = ref(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// ─── Control Center pilot: a fixed viewport, the K anchored and rotating,
// three "moments" cross-fading in front of it as the scroll progresses ──────
const controlViewportRef = ref(null);
const controlKRef = ref(null);
const controlMoment1Ref = ref(null);
const controlMoment2Ref = ref(null);
const controlMoment3Ref = ref(null);

// Tweened directly by GSAP below (a `reactive` object, not a `ref`, so GSAP
// can mutate `scrollK.rotationY`/`scrollK.scale` per frame like any other
// tween target — Vue's reactivity picks up those writes the same way it
// would its own). Passed into KontrolLogo3D as props; the 3D model itself
// can't be scroll-scrubbed via a CSS transform like a flat element, since
// that would just spin the rendered canvas in 2D instead of turning the
// model in its own 3D space.
const scrollK = reactive({ rotationY: 0, scale: 1 });

function setupControlCenter() {
  if (reduceMotion.value || isMobile.value) return; // .no-pin CSS already shows the moments stacked, statically

  const moments = [controlMoment1Ref.value, controlMoment2Ref.value, controlMoment3Ref.value];
  if (moments.some(m => !m)) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#control-center",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
    },
  });

  const modules = gsap.utils.toArray(".control-module", moments[0]);

  // The first moment carries the module grid, so it gets roughly half the
  // scroll range; the two headline-only moments split the rest.
  tl.to(scrollK, { rotationY: Math.PI * 1.8, scale: 1.5, duration: 1, ease: "none" }, 0)
    // The K sits behind the grid: dimmed while there's text to read over it,
    // back to full once only a headline is left in front of it.
    .fromTo(controlKRef.value, { opacity: 0.25 }, { opacity: 1, duration: 0.1 }, 0.46)
    .fromTo(moments[0], { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0)
    .from(modules, { opacity: 0, y: 24, stagger: 0.02, duration: 0.1 }, 0.03)
    .to(moments[0], { opacity: 0, duration: 0.08 }, 0.46)
    .fromTo(moments[1], { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.56)
    .to(moments[1], { opacity: 0, duration: 0.1 }, 0.74)
    .fromTo(moments[2], { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.84);

  landingScrollTriggers.push(tl.scrollTrigger);
}

// ─── Problem pin: Chaos and Order fly in from opposite sides and land side
// by side — previously both cards were stacked in the exact same spot and
// cross-faded, which meant only one was ever actually visible at a time
// (and if the fade misfired, the other could stay permanently hidden). Now
// each card animates independently to its own on-screen position, so both
// are guaranteed visible once scrolled past. ─────────────────────────────────
const chaosWrapRef = ref(null);
const orderWrapRef = ref(null);

function setupProblemPin() {
  // On mobile the cards would wrap to stack vertically inside a fixed
  // 100vh sticky viewport (see .problem-viewport) — two full Card components
  // plus the heading easily exceed that height there, clipping content with
  // no way to scroll to see the rest. The static .no-pin layout sidesteps
  // that entirely by not pinning/fixing the height at all.
  if (reduceMotion.value || isMobile.value) return;

  const chaos = chaosWrapRef.value;
  const order = orderWrapRef.value;
  if (!chaos || !order) return;

  gsap.set(chaos, { opacity: 0, x: -80, rotation: -8 });
  gsap.set(order, { opacity: 0, x: 80, rotation: 8 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#problem",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
    },
  });

  tl.to(chaos, { opacity: 1, x: 0, rotation: 0, duration: 1, ease: "none" }, 0)
    .to(order, { opacity: 1, x: 0, rotation: 0, duration: 1, ease: "none" }, 0.15)
    // Hold: without this, the reveal above (ending at t=1.15) gets stretched
    // across the ENTIRE pinned scroll range, so both cards only reach full
    // opacity right as the section is about to release — you never get to
    // actually see them settled. This empty tween pads the timeline so the
    // reveal finishes within the first ~25% of the scroll and the cards just
    // sit there, fully visible, for the remaining ~75% before it lets go.
    .to({}, { duration: 10 });

  landingScrollTriggers.push(tl.scrollTrigger);
}

// ── Solution: unlike Control Center/Problem (hard pin), the command center
// assembles from its four directions in a single scrub timeline tied to the
// section's own scroll-through — no sticky viewport, so there's no risk of
// this content-heavy grid overflowing a fixed 100vh (can't verify visually
// this session). Distinct dynamic: one continuous build sequence instead of
// each element triggering independently. ────────────────────────────────────
function setupSolutionScrub() {
  if (reduceMotion.value) return;

  gsap.set("#solution .sub-title", { opacity: 0, y: 30 });
  gsap.set("#solution .description", { opacity: 0, y: 20 });
  gsap.set(".magic-circles-wrapper", { opacity: 0 });
  gsap.set(".main-circle", { opacity: 0, scale: 0.4, rotation: -120 });
  gsap.set(".sub-1", { opacity: 0, y: -70 });
  gsap.set(".sub-2", { opacity: 0, x: -70 });
  gsap.set(".sub-3", { opacity: 0, x: 70 });
  gsap.set(".sub-4", { opacity: 0, y: 70 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#solution",
      start: "top 70%",
      end: "bottom 60%",
      scrub: 0.6,
    },
  });

  tl.to("#solution .sub-title", { opacity: 1, y: 0, duration: 1, ease: "none" }, 0)
    .to("#solution .description", { opacity: 1, y: 0, duration: 1, ease: "none" }, 0.15)
    .to(".magic-circles-wrapper", { opacity: 1, duration: 1.2, ease: "none" }, 0.3)
    .to(".main-circle", { opacity: 1, scale: 1, rotation: 0, duration: 1.3, ease: "none" }, 0.5)
    .to(".sub-1", { opacity: 1, y: 0, duration: 1, ease: "none" }, 0.75)
    .to(".sub-2", { opacity: 1, x: 0, duration: 1, ease: "none" }, 0.82)
    .to(".sub-3", { opacity: 1, x: 0, duration: 1, ease: "none" }, 0.89)
    .to(".sub-4", { opacity: 1, y: 0, duration: 1, ease: "none" }, 0.96);

  landingScrollTriggers.push(tl.scrollTrigger);
}

function setupScrollChoreography() {
  if (reduceMotion.value) return;

  // ── Features: heading drops in from above, cards cascade in a stagger ──────
  revealOnScroll("#features .sub-title", { opacity: 0, y: -30, scale: 0.92 }, { start: "top 85%" });
  revealOnScroll("#features .description", { opacity: 0, y: 20 }, { start: "top 82%" });
  // No y-offset here: MagicBento's cards 3/4/6 use overlapping grid-column/row
  // spans for its mosaic layout, so translating a card vertically while it
  // reveals can visually ride over the neighboring cell. Scale-from-center
  // grows within its own footprint instead.
  revealOnScroll(gsap.utils.toArray("#features .magic-bento-card"), { opacity: 0, scale: 0.85, stagger: 0.08 }, { start: "top 78%", end: "+=550" });

  // ── Steps: heading leans in with a slight skew, like a step tilting into place ──
  revealOnScroll("#steps .sub-title", { opacity: 0, x: -50, skewX: 6 }, { start: "top 85%" });

  // ── Companies: copy slides in from the left, the card stack answers from the right ──
  revealOnScroll("#companies .steps-header .sub-title", { opacity: 0, x: -60 }, { start: "top 80%" });
  revealOnScroll("#companies .steps-header p", { opacity: 0, x: -40 }, { start: "top 78%" });
  revealOnScroll(".companies-swap", { opacity: 0, x: 60, scale: 0.9 }, { start: "top 75%" });

  // ── Start: final CTA punches in with a bounce, distinct from every other ease used ──
  revealOnScroll("#start .sub-title", { opacity: 0, scale: 0.6, ease: "back.out(1.7)" }, { start: "top 85%" });
  revealOnScroll("#start p", { opacity: 0, y: 20 }, { start: "top 82%" });
  revealOnScroll("#start .anchor", { opacity: 0, scale: 0.7, ease: "back.out(1.7)" }, { start: "top 80%" });
}

onMounted(() => {
  handleLandingResize();
  window.addEventListener("resize", handleLandingResize);
  setupBackgroundVideoScrub();
  setupControlCenter();
  setupProblemPin();
  setupSolutionScrub();
  setupScrollChoreography();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleLandingResize);
  landingScrollTriggers.forEach(st => st.kill());
  landingScrollTriggers.length = 0;
});

/**
 * Las listas viven en el diccionario como arreglos, así que `tm` las devuelve
 * en el idioma activo y `rt` resuelve cada mensaje compilado.
 */
const listOf = (key) => tm(key).map((item) => rt(item));

const chaosCharacteristics = computed(() =>
  listOf("landing.problem.chaos.items").map((title) => ({ title }))
);

const orderCharacteristics = computed(() =>
  listOf("landing.problem.order.items").map((title) => ({ title }))
);

// The shop's daily work (stock, sales, suppliers) first, then the rest of the
// business the same platform covers.
const controlModules = [
  { key: "inventory", icon: Boxes },
  { key: "sales", icon: ShoppingCart },
  { key: "suppliers", icon: Truck },
  { key: "budget", icon: Wallet },
  { key: "reports", icon: FileBarChart },
  { key: "projects", icon: FolderKanban },
  { key: "marketing", icon: Megaphone },
  { key: "chat", icon: MessagesSquare },
  { key: "assistant", icon: Bot },
];

const featureCards = computed(() => [
  { ...card("analytics"), icon: BarChart2 },
  { ...card("dashboard"), icon: LayoutDashboard },
  { ...card("collaboration"), icon: Users },
  { ...card("automation"), icon: Zap },
  { ...card("integration"), icon: Puzzle },
  { ...card("security"), icon: ShieldCheck },
]);

function card(name) {
  return {
    label: t(`landing.features.cards.${name}.label`),
    title: t(`landing.features.cards.${name}.title`),
    description: t(`landing.features.cards.${name}.description`),
  };
}
</script>
