<template>
  <main>
    <Navbar />
    <section id="header">
      <div class="header-container">
        <Pill
          label="The future of Business"
          btnColor="var(--PillBack)"
          circleColor="var(--Primary)"
          textColor="var(--Primary)"
        />
        <AnimatedText
          style="margin-top: 0"
          effects="split shiny"
          text="Take control of your bussiness"
          tag="h1"
          class="hero-title"
          color="var(--Primary)"
          shine-color="var(--Text)"
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
            backColor="var(--Primary)"
            hoverColor="var(--Tertiary)"
            :icon="arrowRightIcon"
          />
          <Anchor
            label="Start managing your business"
            backColor="var(--Tertiary)"
            hoverColor="var(--Secondary)"
            :icon="arrowRightIcon"
          />
        </div>
      </div>
    </section>

    <section id="problem">
      <div class="problem-container">
        <h2 class="sub-title">
          Stop juggling tools to <span class="marked">run your business</span>
        </h2>

        <div class="cards">
          <Card
            title="The Chaos"
            subtitle="Disjointed systems that slow you down."
            :icon="LayoutGrid"
            :iconSize="100"
            iconColor="var(--Background3)"
            :listIcon="CircleX"
            :listIconSize="24"
            listIconColor="var(--Error)"
            :characteristics="chaosCharacteristics"
            back="var(--Tertiary)"
            borderColor="var(--Border)"
            titleColor="var(--Text)"
          />

          <Card
            title="The Order"
            subtitle="Unified ecosystem designed for scale."
            :icon="Sparkles"
            :iconSize="100"
            iconColor="var(--Primary2)"
            :listIcon="CircleCheck"
            :listIconSize="24"
            listIconColor="var(--Success)"
            :characteristics="orderCharacteristics"
            back="var(--Background2)"
            borderColor="var(--Border)"
            titleColor="var(--Primary2)"
            shadowColor="var(--Border)"
          />
        </div>
      </div>
    </section>

    <section id="solution">
      <div class="solution-container">
        <h2 class="sub-title">The Comand Center</h2>
        <p class="description">
          Every facet of your operation, unified in a high-fidelity dashboard
          that anticipates your next move.
        </p>
        <div class="magic-circles-wrapper">
          <MagicCircles
            color="var(--Primary2)"
            color-two="var(--Primary)"
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
            :background="`linear-gradient(color-mix(in srgb, var(--Background) 90%, transparent), color-mix(in srgb, var(--Tertiary) 80%, transparent))`"
          />
          <div class="graph">
            <CircleRounded
              :size="200"
              color="var(--Primary)"
              roundedColor="var(--Primary2)"
              :animationDuration="3"
              :icon="NetworkIcon"
              class="main-circle"
            />
            <Card
              class="sub-1"
              title="Finances"
              subtitle="Real-time cashflow tracking"
              :icon="Banknote"
              :iconSize="100"
              back="var(--Tertiary)"
              iconColor="var(--Text)"
              borderColor="var(--Border)"
              shadowColor="var(--Primary)"
            />
            <Card
              class="sub-2"
              title="Team CRM"
              subtitle="Collaboration simplified"
              :icon="UsersRound"
              :iconSize="100"
              back="var(--Tertiary)"
              iconColor="var(--Text)"
              borderColor="var(--Border)"
              shadowColor="var(--Primary)"
            />
            <Card
              class="sub-3"
              title="Marketing"
              subtitle="Omnichannel campaigns"
              :icon="Megaphone"
              :iconSize="100"
              back="var(--Tertiary)"
              iconColor="var(--Text)"
              borderColor="var(--Border)"
              shadowColor="var(--Primary)"
            />
            <Card
              class="sub-4"
              title="Inventory"
              subtitle="Automated stock control"
              :icon="Box"
              :iconSize="100"
              back="var(--Tertiary)"
              iconColor="var(--Text)"
              borderColor="var(--Border)"
              shadowColor="var(--Primary)"
            />
          </div>
        </div>
      </div>
    </section>

    <section id="features">
      <h2 class="sub-title">How it works?</h2>
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
        card-background="var(--Background2)"
        card-border="var(--Border)"
        label-color="var(--Primary)"
        title-color="var(--Text)"
        description-color="var(--Text)"
        glow-color="var(--Primary)"
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
          style="background: var(--Background2)"
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
          style="background: var(--Background2)"
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
          style="background: var(--Background2)"
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
  </main>
</template>

<script setup>
import "./LandingPage.css";
import MagicBento from "../components/UI/AnimatedComponents/MagicBento.vue";
import Navbar from "../components/Navbar.vue";
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
} from "lucide-vue-next";

import MagicCircles from "../components/UI/Backgrounds/MagicCircles/MagicCircles.vue";
import CircleRounded from "../components/UI/CircleRounded/CircleRounded.vue";
import ScrollStack from "../components/UI/AnimatedComponents/ScrollStack.vue";
import ScrollStackItem from "../components/UI/AnimatedComponents/ScrollStackItem.vue";

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
