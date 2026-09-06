<template>
  <main>
    <Navbar />
    <section id="header">
      <div class="header-container">
        <Pill
          label="The future of Business"
          btnColor="var(--k-color-pill-back)"
          circleColor="var(--k-color-primary)"
          textColor="var(--k-color-primary)"
        />
        <AnimatedText
          style="margin-top: 0"
          effects="split shiny"
          text="Take control of your business"
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
          :disabled="false"
          :split-delay="50"
          :duration="1.25"
          ease="power3.out"
          :from="{ opacity: 0, y: 40 }"
          :to="{ opacity: 1, y: 0 }"
        />
        <p>
          Manage projects, finances, marketing and communication from one
          centralized platform. Designed for the ambitious.
        </p>

        <div class="goto">
          <Anchor
            label="Start managing your business"
            backColor="var(--k-color-primary)"
            hoverColor="var(--k-color-tertiary)"
            :icon="arrowRightIcon"
            link="/register"
          />
          <Anchor
            label="See How it works"
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
    <section id="control-center" :class="{ 'no-pin': reduceMotion }">
      <div class="control-center-viewport" ref="controlViewportRef">
        <div class="control-k-wrapper" aria-hidden="true">
          <KontrolLogo3D
            width="380px"
            height="380px"
            :idle-spin-speed="0.04"
            :scroll-rotation-y="scrollK.rotationY"
            :scroll-scale="scrollK.scale"
          />
        </div>

        <div class="control-moment control-moment-1" ref="controlMoment1Ref">
          <h2 class="sub-title">One command center.</h2>
        </div>

        <div class="control-moment control-moment-2" ref="controlMoment2Ref">
          <h2 class="sub-title">Every part of your business.</h2>
          <ul class="control-moment-tags">
            <li>Projects</li>
            <li>Finance</li>
            <li>Marketing</li>
            <li>Inventory</li>
          </ul>
        </div>

        <div class="control-moment control-moment-3" ref="controlMoment3Ref">
          <h2 class="sub-title">Under your control.</h2>
        </div>
      </div>
    </section>

    <!-- Pinned like #control-center: the heading stays put while scroll
         morphs "The Chaos" into "The Order" in the same spot — see
         setupProblemPin(). -->
    <section id="problem" :class="{ 'no-pin': reduceMotion }">
      <div class="problem-viewport">
        <h2 class="sub-title">
          Stop juggling tools to <span class="marked">run your business</span>
        </h2>

        <div class="problem-stage">
          <div class="problem-card-wrap" ref="chaosWrapRef">
            <Card
              title="The Chaos"
              subtitle="Disjointed systems that slow you down."
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
              title="The Order"
              subtitle="Unified ecosystem designed for scale."
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
        <h2 class="sub-title">The Command Center</h2>
        <p class="description">
          Every facet of your operation, unified in a high-fidelity dashboard
          that anticipates your next move.
        </p>
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
              title="Finances"
              subtitle="Real-time cashflow tracking"
              :icon="Banknote"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-2"
              title="Team CRM"
              subtitle="Collaboration simplified"
              :icon="UsersRound"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-3"
              title="Marketing"
              subtitle="Omnichannel campaigns"
              :icon="Megaphone"
              :iconSize="48"
              back="var(--k-color-tertiary)"
              iconColor="var(--k-color-text)"
              borderColor="var(--k-color-border)"
              shadowColor="var(--k-color-primary)"
            />
            <Card
              class="sub-4"
              title="Inventory"
              subtitle="Automated stock control"
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
      <h2 class="sub-title">Features</h2>
      <p class="description">
        Everything a growing business needs, built into one system instead of
        stitched together from five.
      </p>
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
        :disable-animations="false"
        card-background="var(--k-color-bg-2)"
        card-border="var(--k-color-border)"
        label-color="var(--k-color-primary)"
        title-color="var(--k-color-text)"
        description-color="var(--k-color-text)"
        glow-color="var(--k-color-primary)"
        :cards="[
          {
            label: 'Insights',
            title: 'Analytics',
            description: 'Track user behavior',
            icon: BarChart2,
          },
          {
            label: 'Overview',
            title: 'Dashboard',
            description: 'Centralized data view',
            icon: LayoutDashboard,
          },
          {
            label: 'Teamwork',
            title: 'Collaboration',
            description: 'Work together seamlessly',
            icon: Users,
          },
          {
            label: 'Efficiency',
            title: 'Automation',
            description: 'Streamline workflows',
            icon: Zap,
          },
          {
            label: 'Connectivity',
            title: 'Integration',
            description: 'Connect favorite tools',
            icon: Puzzle,
          },
          {
            label: 'Protection',
            title: 'Security',
            description: 'Enterprise-grade protection',
            icon: ShieldCheck,
          },
        ]"
      />
    </section>

    <section id="steps">
      <h2 class="sub-title">Steps to get full control</h2>
      <ScrollStack
        :use-window-scroll="true"
        :item-distance="50"
        :item-stack-distance="30"
        stack-position="50%"
        scale-end-position="30%"
        :base-scale="0.85"
      >
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :step="1"
          title="Connect your ecosystem"
          description="Bring your tools together with one central command center."
          :process="[
            'Link sales, finance and operations in one place',
            'Import workflows and standardize handoffs',
            'Enable automated alerts across teams',
          ]"
        />
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :step="2"
          title="Automate your workflow"
          description="Turn manual handoffs into automated processes that move work forward."
          :process="[
            'Define automation triggers and conditions',
            'Route tasks to the right teams instantly',
            'Monitor every step with full visibility',
          ]"
        />
        <ScrollStackItem
          style="background: var(--k-color-bg-2)"
          :step="3"
          title="Optimize outcomes"
          description="Use live performance data to refine processes and improve business results."
          :process="[
            'Track key metrics in real time',
            'Identify bottlenecks and fix them fast',
            'Scale the system as your team grows',
          ]"
        />
      </ScrollStack>
    </section>

    <section id="companies">
      <div class="companies-wrapper">
        <div class="steps-header">
          <h2 class="sub-title">Built for every modern merchant</h2>
          <p>
            Designed to adapt to any business, from small shops to large-scale
            operations, providing the tools needed to manage, grow, and scale
            effortlessly
          </p>
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
              <span class="swap-card-tag">Store Owners</span>
              <h3 class="swap-card-title">Full control of your business</h3>
              <p class="swap-card-description">
                Manage operations, track performance, and optimize your store
                with tools designed to simplify daily workflows.
              </p>
              <ul class="swap-card-list">
                <li>Real-time sales tracking</li>
                <li>Inventory management</li>
                <li>Customer insights & reports</li>
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
              <span class="swap-card-tag">Automotive</span>
              <h3 class="swap-card-title">Built for high-demand operations</h3>
              <p class="swap-card-description">
                Handle complex workflows, service tracking, and inventory with
                precision tailored for automotive businesses.
              </p>
              <ul class="swap-card-list">
                <li>Service & repair tracking</li>
                <li>Parts inventory control</li>
                <li>Workflow automation</li>
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
              <span class="swap-card-tag">Food Vendors</span>
              <h3 class="swap-card-title">Fast, reliable, always ready</h3>
              <p class="swap-card-description">
                Keep orders moving and customers satisfied with tools designed
                for speed, efficiency, and peak hours.
              </p>
              <ul class="swap-card-list">
                <li>Order management system</li>
                <li>Real-time menu updates</li>
                <li>Peak-hour performance optimization</li>
              </ul>
            </div>
          </CarSwapItem>
        </CardSwap>
        </div>
      </div>
    </section>
    <section id="craft">
      <div class="craft-container">
        <h2 class="sub-title">Precision, down to the pixel</h2>
        <p class="description">
          Move your cursor over the grid. Every detail in Kontrol reacts the
          same way &mdash; instantly, and exactly where you expect it.
        </p>
        <GridWave
          :rows="gridSize.rows"
          :cols="gridSize.cols"
          base-color="var(--k-color-border)"
          active-color="var(--k-color-primary-2)"
          :radius="160"
          :max-scale="1.6"
        />
      </div>
    </section>

    <section id="start">
      <h2 class="sub-title">Start controlling your business today.</h2>
      <p>
        Join 50,000+ businesses using Kontrol to eliminate chaos and drive
        growth.
      </p>
      <Anchor
        label="Enter the command center"
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
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger);
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

import MagicCircles from "../components/UI/Backgrounds/MagicCircles/MagicCircles.vue";
import CircleRounded from "../components/UI/CircleRounded/CircleRounded.vue";
import ScrollStack from "../components/UI/AnimatedComponents/ScrollStack.vue";
import ScrollStackItem from "../components/UI/AnimatedComponents/ScrollStackItem.vue";
import CardSwap from "../components/UI/AnimatedComponents/CardsSwap.vue";
import CarSwapItem from "../components/UI/AnimatedComponents/CarSwapItem.vue";
import GridWave from "../components/UI/Backgrounds/GridWave/GridWave.vue";
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

// ─── Responsive GridWave density ──────────────────────────────────────────────
// Fewer cells on small screens: same effect, no cramped/tiny squares.
const gridSize = ref({ rows: 12, cols: 12 });

function updateGridSize() {
  const vw = window.innerWidth;
  if (vw < 480) {
    gridSize.value = { rows: 7, cols: 7 };
  } else if (vw < 768) {
    gridSize.value = { rows: 9, cols: 9 };
  } else if (vw < 1024) {
    gridSize.value = { rows: 10, cols: 10 };
  } else {
    gridSize.value = { rows: 12, cols: 12 };
  }
}

function handleLandingResize() {
  updateCardSwapSize();
  updateGridSize();
}

// ─── Scroll choreography ────────────────────────────────────────────────────
// Each section gets its own entrance signature, tied to the scroll position —
// this is what makes the page feel animated as you scroll rather than static
// content that just happens to be below the fold. `toggleActions: "restart
// none none reverse"` is the standard GSAP pattern for "play forward on enter,
// play backward on leave-back", so every animation replays each time its
// section re-enters the viewport, scrolling either up or down.
const landingScrollTriggers = [];

function revealOnScroll(target, fromVars, triggerVars = {}) {
  if (!target || (Array.isArray(target) && !target.length)) return;
  const tween = gsap.from(target, {
    duration: 0.9,
    ease: "power3.out",
    // Otherwise GSAP leaves the tween's final transform/opacity as an inline
    // style forever, which outranks CSS `:hover` rules (e.g. Card.css's lift
    // on hover) — clearProps only fires on forward completion, never on the
    // reverse (see the toggleActions below), so the hidden state in between
    // reveals is untouched and the repeat behavior still works.
    clearProps: "transform,opacity,filter",
    ...fromVars,
    scrollTrigger: {
      trigger: Array.isArray(target) ? target[0] : target,
      start: "top 82%",
      toggleActions: "restart none none reverse",
      ...triggerVars,
    },
  });
  if (tween.scrollTrigger) landingScrollTriggers.push(tween.scrollTrigger);
}

// ─── Control Center pilot: a fixed viewport, the K anchored and rotating,
// three "moments" cross-fading in front of it as the scroll progresses ──────
const reduceMotion = ref(false);
const controlViewportRef = ref(null);
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
  if (reduceMotion.value) return; // .no-pin CSS already shows the moments stacked, statically

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

  tl.to(scrollK, { rotationY: Math.PI * 1.8, scale: 1.5, duration: 1, ease: "none" }, 0)
    .fromTo(moments[0], { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0)
    .to(moments[0], { opacity: 0, duration: 0.12 }, 0.24)
    .fromTo(moments[1], { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.32)
    .to(moments[1], { opacity: 0, duration: 0.12 }, 0.62)
    .fromTo(moments[2], { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.72);

  landingScrollTriggers.push(tl.scrollTrigger);
}

// ─── Problem pin: Chaos morphs into Order in the same spot ─────────────────────
const chaosWrapRef = ref(null);
const orderWrapRef = ref(null);

function setupProblemPin() {
  if (reduceMotion.value) return; // .no-pin CSS shows both cards stacked, statically

  const chaos = chaosWrapRef.value;
  const order = orderWrapRef.value;
  if (!chaos || !order) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#problem",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
    },
  });

  gsap.set(order, { opacity: 0, scale: 0.7, rotation: 15, x: 60 });

  tl.to(chaos, { opacity: 0, scale: 0.7, rotation: -15, x: -60, duration: 1, ease: "none" }, 0)
    .to(order, { opacity: 1, scale: 1, rotation: 0, x: 0, duration: 1, ease: "none" }, 0);

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
  revealOnScroll(gsap.utils.toArray("#features .magic-bento-card"), { opacity: 0, scale: 0.85, stagger: 0.08 }, { start: "top 78%" });

  // ── Steps: heading leans in with a slight skew, like a step tilting into place ──
  revealOnScroll("#steps .sub-title", { opacity: 0, x: -50, skewX: 6 }, { start: "top 85%" });

  // ── Companies: copy slides in from the left, the card stack answers from the right ──
  revealOnScroll("#companies .steps-header .sub-title", { opacity: 0, x: -60 }, { start: "top 80%" });
  revealOnScroll("#companies .steps-header p", { opacity: 0, x: -40 }, { start: "top 78%", duration: 0.7 });
  revealOnScroll(".companies-swap", { opacity: 0, x: 60, scale: 0.9 }, { start: "top 75%" });

  // ── Craft: the grid materializes — heading blurs into focus ─────────────────
  revealOnScroll("#craft .sub-title", { opacity: 0, y: 10, filter: "blur(12px)" }, { start: "top 85%" });
  revealOnScroll("#craft .description", { opacity: 0, y: 20 }, { start: "top 82%" });
  revealOnScroll(".grid-wave", { opacity: 0, scale: 0.92 }, { start: "top 75%", duration: 1.1 });

  // ── Start: final CTA punches in with a bounce, distinct from every other ease used ──
  revealOnScroll("#start .sub-title", { opacity: 0, scale: 0.6, ease: "back.out(1.7)" }, { start: "top 85%" });
  revealOnScroll("#start p", { opacity: 0, y: 20 }, { start: "top 82%" });
  revealOnScroll("#start .anchor", { opacity: 0, scale: 0.7, ease: "back.out(1.7)" }, { start: "top 80%" });
}

onMounted(() => {
  reduceMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  handleLandingResize();
  window.addEventListener("resize", handleLandingResize);
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

const chaosCharacteristics = [
  { title: "WhatsApp threads for project updates" },
  { title: "Scattered Excel spreadsheets" },
  { title: "Physical notebooks and sticky notes" },
  { title: "Missing invoices and late payments" },
];

const orderCharacteristics = [
  { title: "Centralized Project Command" },
  { title: "Automated Financial Intelligence" },
  { title: "Unified Marketing Hub" },
  { title: "AI-Powered Data Analysis" },
];
</script>
