<template>
  <Teleport to="body">
    <div
      v-if="birdieStore.isOpen"
      class="birdie-assistant"
      :class="{ 'birdie-assistant--no-transition': isDragging || skipTransition }"
      :style="containerStyle"
    >
      <!-- Close (return to FAB) -->
      <button
        v-if="!isFlying"
        class="birdie-close"
        type="button"
        :aria-label="t('birdie.closeAssistant')"
        :title="t('birdie.closeAssistant')"
        @click.stop="closeAssistant"
        @mousedown.stop
        @touchstart.stop
      >×</button>

      <!-- Speech bubble: shows '?' button OR FAQ dropdown OR answer text -->
      <Transition name="bubble">
        <div
          v-if="bubbleVisible"
          class="birdie-bubble"
          :class="[
            `birdie-bubble--anchor-${bubbleAnchor}`,
            {
              'birdie-bubble--wide': showFaqMenu || speechText,
              'birdie-bubble--below': !bubbleAbove,
              'birdie-bubble--clickable': isIdleBubble,
            },
          ]"
          :role="isIdleBubble ? 'button' : null"
          :tabindex="isIdleBubble ? 0 : null"
          @mousedown.stop
          @touchstart.stop
          @click="onBubbleClick"
          @keydown.enter="onBubbleClick"
        >
          <span
            v-if="isIdleBubble"
            class="birdie-bubble-q"
            aria-hidden="true"
          >?</span>

          <div v-else-if="showFaqMenu" class="birdie-faq">
            <p class="birdie-faq-title">{{ t('birdie.faqTitle') }}</p>

            <div v-if="contextualFaqs.length" class="birdie-faq-section">
              <p class="birdie-faq-section-title">{{ t('birdie.onThisPage') }}</p>
              <div class="birdie-faq-list">
                <button
                  v-for="faq in contextualFaqs"
                  :key="faq.id"
                  class="birdie-faq-item"
                  type="button"
                  @click.stop="selectFaq(faq)"
                >
                  {{ t(faq.questionKey) }}
                </button>
              </div>
            </div>

            <p v-else class="birdie-faq-empty">{{ t('birdie.noContext') }}</p>

            <button
              v-if="secondaryFaqs.length"
              class="birdie-faq-toggle"
              type="button"
              @click.stop="showMoreFaqs = !showMoreFaqs"
            >
              <span class="birdie-faq-toggle-icon">{{ showMoreFaqs ? '−' : '+' }}</span>
              {{ showMoreFaqs ? t('birdie.showLess') : t('birdie.showMore') }}
            </button>

            <div v-if="showMoreFaqs && secondaryFaqs.length" class="birdie-faq-section">
              <p class="birdie-faq-section-title">{{ t('birdie.elsewhere') }}</p>
              <div class="birdie-faq-list">
                <button
                  v-for="faq in secondaryFaqs"
                  :key="faq.id"
                  class="birdie-faq-item"
                  type="button"
                  @click.stop="selectFaq(faq)"
                >
                  {{ t(faq.questionKey) }}
                </button>
              </div>
            </div>

            <button
              class="birdie-faq-close"
              type="button"
              @click.stop="closeFaq"
            >{{ t('birdie.close') }}</button>
          </div>

          <div v-else-if="speechText" class="birdie-speech">
            <p class="birdie-speech-text">{{ displayedSpeech }}</p>
            <button
              v-if="speechComplete"
              class="birdie-speech-ok"
              type="button"
              @click.stop="dismissSpeech"
            >{{ t('birdie.gotIt') }}</button>
          </div>

          <span class="birdie-bubble-tail" />
        </div>
      </Transition>

      <!-- Birdie sprite -->
      <div
        class="birdie-sprite"
        :class="{
          'birdie-sprite--flip': facingLeft,
          'birdie-sprite--dragging': isDragging,
        }"
        :style="spriteStyle"
        :title="t('birdie.tooltip')"
        @mousedown="onPointerDown"
        @touchstart.passive="onPointerDown"
        @click="onBirdieClick"
        @dblclick="onBirdieDoubleClick"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useBirdieStore } from '../../stores/birdie'
import talkSheet from '../../assets/img/birdie/talk-sheet.png'
import flySheet from '../../assets/img/birdie/fly1-sheet.png'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const birdieStore = useBirdieStore()

// ───────────────── Sprite specs ─────────────────
// talk-sheet: 5 frames @ 800w x 879h each → ratio ~0.91
// fly-sheet:  5 frames @ 917w x 584h each → ratio ~1.57
const TALK_FRAME_W = 800
const TALK_FRAME_H = 879
const FLY_FRAME_W  = 917
const FLY_FRAME_H  = 584
const FRAME_COUNT  = 5

// Visual scale: pick a target height; widths follow per-mode aspect
const TARGET_HEIGHT_TALK = 135
const TARGET_HEIGHT_FLY  = 110
const TALK_W = Math.round(TALK_FRAME_W * (TARGET_HEIGHT_TALK / TALK_FRAME_H))
const TALK_H = TARGET_HEIGHT_TALK
const FLY_W  = Math.round(FLY_FRAME_W  * (TARGET_HEIGHT_FLY  / FLY_FRAME_H))
const FLY_H  = TARGET_HEIGHT_FLY

const MARGIN = 24
const DRAG_THRESHOLD = 4
const STORAGE_KEY = 'birdie-assistant-home'

// ───────────────── State ─────────────────
const spriteMode = ref('talk')      // 'talk' | 'fly'
const facingLeft = ref(false)       // sprite faces right by default
const isAnimating = ref(false)
const position = ref(loadHomePosition())
const isFlying = ref(false)
const skipTransition = ref(false)   // disables CSS transition for instant snaps
const showFaqMenu = ref(false)
const showMoreFaqs = ref(false)
const speechText = ref('')
const displayedSpeech = ref('')
const speechComplete = ref(false)
const viewportBump = ref(0)         // bumped on resize so bubble computeds re-run

// Drag tracking
const isDragging = ref(false)
const wasDragged = ref(false)
const dragStart = ref(null)

// Talk/fly animation timers
const talkFrameTimer = ref(null)
const speechTimer = ref(null)
const flyFrameTimer = ref(null)
const flightTimer = ref(null)
const currentFrame = ref(0)
const wingsOpenForExit = ref(false)
const exitTimer = ref(null)
const exitClickCount = ref(0)

const bubbleVisible = computed(() => !isFlying.value && !isDragging.value)
const isIdleBubble = computed(() => !showFaqMenu.value && !speechText.value)

// Approximate space (in px) the bubble needs based on its current contents.
// Used to decide where to place it relative to the bird so it stays visible.
// Constants chosen to match the actual rendered sizes; if you change padding
// or font-size, revisit them.
const FAQ_ITEM_HEIGHT       = 38
const FAQ_SECTION_TITLE     = 24
const FAQ_BASE              = 28 + 32 + 24  // title + close button + paddings
const FAQ_TOGGLE_HEIGHT     = 40
function estimateBubbleHeight() {
  if (speechText.value) return 140
  if (!showFaqMenu.value) return 60
  const ctxCount = contextualFaqs.value.length
  const secCount = secondaryFaqs.value.length
  let h = FAQ_BASE
  h += ctxCount > 0 ? (FAQ_SECTION_TITLE + ctxCount * FAQ_ITEM_HEIGHT) : 30
  if (secCount > 0) {
    h += FAQ_TOGGLE_HEIGHT
    if (showMoreFaqs.value) h += FAQ_SECTION_TITLE + secCount * FAQ_ITEM_HEIGHT
  }
  return h
}
function estimateBubbleHalfWidth() {
  if (showFaqMenu.value) return 170
  if (speechText.value)  return 160
  return 30
}

// Place the bubble above by default, but flip below when the bird is dragged
// near the top of the viewport. Bumped by `viewportBump` so resize re-runs it.
const bubbleAbove = computed(() => {
  viewportBump.value
  if (typeof window === 'undefined') return true
  const needed = estimateBubbleHeight()
  const spaceAbove = position.value.y - 20
  const spaceBelow = window.innerHeight - (position.value.y + TALK_H) - 20
  if (spaceAbove >= needed) return true
  if (spaceBelow >= needed) return false
  return spaceAbove >= spaceBelow
})

// Center the bubble above the bird when possible, otherwise anchor its left or
// right edge to the bird's footprint so it never overflows the viewport.
const bubbleAnchor = computed(() => {
  viewportBump.value
  if (typeof window === 'undefined') return 'center'
  const halfW = estimateBubbleHalfWidth()
  const birdCenterX = position.value.x + TALK_W / 2
  if (birdCenterX - halfW < 12) return 'left'
  if (birdCenterX + halfW > window.innerWidth - 12) return 'right'
  return 'center'
})

function onBubbleClick() {
  if (isIdleBubble.value) openFaq()
}

// ───────────────── FAQ catalogue ─────────────────
// Each FAQ:
//   id, questionKey, answerKey
//   contextRoutes: array of route paths (supports '/foo/*' wildcard)
//   target?: CSS selector(s) to find element on current page (comma-separated; first hit wins)
//   route?:  optional route to navigate to BEFORE finding target (used by secondary FAQs)
const FAQ_CATALOG = [
  // ── Dashboard ────────────────────────────────────────────
  {
    id: 'dashboard-overview',
    contextRoutes: ['/dashboard'],
    questionKey: 'birdie.faqs.dashboardOverview.q',
    answerKey:   'birdie.faqs.dashboardOverview.a',
    target: '.kpi-grid',
  },
  {
    id: 'dashboard-ai',
    contextRoutes: ['/dashboard'],
    questionKey: 'birdie.faqs.dashboardAi.q',
    answerKey:   'birdie.faqs.dashboardAi.a',
    target: '.ai-box, [data-birdie="ai-insight"]',
  },
  {
    id: 'dashboard-trend',
    contextRoutes: ['/dashboard'],
    questionKey: 'birdie.faqs.dashboardTrend.q',
    answerKey:   'birdie.faqs.dashboardTrend.a',
    target: '.trend-svg, .trend-head',
  },

  // ── Projects list ────────────────────────────────────────
  {
    id: 'projects-create',
    contextRoutes: ['/projects'],
    questionKey: 'birdie.faqs.projectsCreate.q',
    answerKey:   'birdie.faqs.projectsCreate.a',
    route: '/projects',
    target: '[data-birdie="create-project"], .proj-header-actions .btn-primary',
  },
  {
    id: 'projects-search',
    contextRoutes: ['/projects'],
    questionKey: 'birdie.faqs.projectsSearch.q',
    answerKey:   'birdie.faqs.projectsSearch.a',
    target: '.proj-search, .filter-input, input[type="search"]',
  },

  // ── Project detail ───────────────────────────────────────
  {
    id: 'project-budget',
    contextRoutes: ['/projects/*'],
    questionKey: 'birdie.faqs.projectBudget.q',
    answerKey:   'birdie.faqs.projectBudget.a',
    target: '[data-birdie="budget-control"], .budget-card',
  },
  {
    id: 'project-tasks',
    contextRoutes: ['/projects/*'],
    questionKey: 'birdie.faqs.projectTasks.q',
    answerKey:   'birdie.faqs.projectTasks.a',
    target: '[data-birdie="tasks-tab"]',
  },
  {
    id: 'project-members',
    contextRoutes: ['/projects/*'],
    questionKey: 'birdie.faqs.projectMembers.q',
    answerKey:   'birdie.faqs.projectMembers.a',
    target: '[data-birdie="invite-members"]',
  },
  {
    id: 'project-progress',
    contextRoutes: ['/projects/*'],
    questionKey: 'birdie.faqs.projectProgress.q',
    answerKey:   'birdie.faqs.projectProgress.a',
    target: '.pd-tab:nth-of-type(5)',
  },

  // ── Inventory ────────────────────────────────────────────
  {
    id: 'inventory-create',
    contextRoutes: ['/inventory'],
    questionKey: 'birdie.faqs.inventoryCreate.q',
    answerKey:   'birdie.faqs.inventoryCreate.a',
    route: '/inventory',
    target: '[data-birdie="create-product"], .inv-header-actions .btn-primary',
  },
  {
    id: 'inventory-sell',
    contextRoutes: ['/inventory', '/inventory/*'],
    questionKey: 'birdie.faqs.inventorySell.q',
    answerKey:   'birdie.faqs.inventorySell.a',
    target: '.sell-btn, [data-birdie="sell-product"], .product-card',
  },
  {
    id: 'inventory-movements',
    contextRoutes: ['/inventory', '/inventory/*'],
    questionKey: 'birdie.faqs.inventoryMovements.q',
    answerKey:   'birdie.faqs.inventoryMovements.a',
    target: '[data-birdie="movements"], .product-card, [data-birdie="create-product"]',
  },
  {
    id: 'inventory-filter',
    contextRoutes: ['/inventory'],
    questionKey: 'birdie.faqs.inventoryFilter.q',
    answerKey:   'birdie.faqs.inventoryFilter.a',
    target: '.project-filter, .pf-tabs',
  },

  // ── Budget ───────────────────────────────────────────────
  {
    id: 'budget-add-funds',
    contextRoutes: ['/budget'],
    questionKey: 'birdie.faqs.addFunds.q',
    answerKey:   'birdie.faqs.addFunds.a',
    route: '/budget',
    target: '[data-birdie="add-funds"]',
  },
  {
    id: 'budget-add-expense',
    contextRoutes: ['/budget'],
    questionKey: 'birdie.faqs.addExpense.q',
    answerKey:   'birdie.faqs.addExpense.a',
    target: '[data-birdie="add-expense"], .header-actions button:last-of-type',
  },
  {
    id: 'budget-add-activity',
    contextRoutes: ['/budget'],
    questionKey: 'birdie.faqs.addActivity.q',
    answerKey:   'birdie.faqs.addActivity.a',
    target: '[data-birdie="add-activity"]',
  },
  {
    id: 'budget-control',
    contextRoutes: ['/budget'],
    questionKey: 'birdie.faqs.budgetControl.q',
    answerKey:   'birdie.faqs.budgetControl.a',
    target: '[data-birdie="budget-summary"], .budget-card',
  },

  // ── Reports ──────────────────────────────────────────────
  {
    id: 'reports-overview',
    contextRoutes: ['/reports', '/reports/*'],
    questionKey: 'birdie.faqs.reportsOverview.q',
    answerKey:   'birdie.faqs.reportsOverview.a',
    target: '[data-birdie="reports-list"], .reports-table, .reports-kpi',
  },

  // ── Chat ─────────────────────────────────────────────────
  {
    id: 'chat-start',
    contextRoutes: ['/chat'],
    questionKey: 'birdie.faqs.chatStart.q',
    answerKey:   'birdie.faqs.chatStart.a',
    target: '[data-birdie="chat-new"], .new-conversation, .conversation-list',
  },
  {
    id: 'chat-call',
    contextRoutes: ['/chat'],
    questionKey: 'birdie.faqs.chatCall.q',
    answerKey:   'birdie.faqs.chatCall.a',
    target: '[data-birdie="chat-call"], .call-btn',
  },

  // ── Agent ────────────────────────────────────────────────
  {
    id: 'agent-capabilities',
    contextRoutes: ['/agent'],
    questionKey: 'birdie.faqs.agentCapabilities.q',
    answerKey:   'birdie.faqs.agentCapabilities.a',
    target: '[data-birdie="agent-input"], textarea, .agent-input',
  },

  // ── Teams ────────────────────────────────────────────────
  {
    id: 'teams-create',
    contextRoutes: ['/teams'],
    questionKey: 'birdie.faqs.teamsCreate.q',
    answerKey:   'birdie.faqs.teamsCreate.a',
    target: '[data-birdie="create-team"], .btn-primary',
  },

  // ── Integrations ─────────────────────────────────────────
  {
    id: 'integrations-list',
    contextRoutes: ['/integrations'],
    questionKey: 'birdie.faqs.integrationsList.q',
    answerKey:   'birdie.faqs.integrationsList.a',
    target: '[data-birdie="integrations-grid"], .integration-card',
  },

  // ── Global / secondary (always available in "More") ──────
  {
    id: 'global-change-language',
    questionKey: 'birdie.faqs.changeLanguage.q',
    answerKey:   'birdie.faqs.changeLanguage.a',
    target: '.lang-btn',
  },
  {
    id: 'global-workspace',
    questionKey: 'birdie.faqs.switchWorkspace.q',
    answerKey:   'birdie.faqs.switchWorkspace.a',
    target: '.empresa-selector',
  },
  {
    id: 'global-ai-shortcut',
    questionKey: 'birdie.faqs.aiAgent.q',
    answerKey:   'birdie.faqs.aiAgent.a',
    route: '/agent',
    target: '[data-birdie="agent-input"], .agent-input, textarea, .appnav-link--agent',
  },
  {
    id: 'global-chat-shortcut',
    questionKey: 'birdie.faqs.chat.q',
    answerKey:   'birdie.faqs.chat.a',
    route: '/chat',
    target: '[data-birdie="chat-new"], .conversation-list, .appnav-link[href="/chat"]',
  },
  {
    id: 'global-reports',
    questionKey: 'birdie.faqs.reportsShortcut.q',
    answerKey:   'birdie.faqs.reportsShortcut.a',
    route: '/reports',
    target: '[data-birdie="reports-list"], .reports-table, .reports-kpi, .appnav-link[href="/reports"]',
  },
  {
    id: 'global-inventory',
    questionKey: 'birdie.faqs.inventoryShortcut.q',
    answerKey:   'birdie.faqs.inventoryShortcut.a',
    route: '/inventory',
    target: '.product-grid, .inv-header, [data-birdie="create-product"]',
  },
  {
    id: 'global-dashboard',
    questionKey: 'birdie.faqs.dashboardShortcut.q',
    answerKey:   'birdie.faqs.dashboardShortcut.a',
    route: '/dashboard',
    target: '.kpi-grid, .ai-box',
  },
  {
    id: 'global-budget',
    questionKey: 'birdie.faqs.budgetGlobal.q',
    answerKey:   'birdie.faqs.budgetGlobal.a',
    route: '/budget',
    target: '[data-birdie="budget-summary"], .budget-card',
  },
  {
    id: 'global-create-project',
    questionKey: 'birdie.faqs.projectsCreate.q',
    answerKey:   'birdie.faqs.projectsCreate.a',
    route: '/projects',
    target: '[data-birdie="create-project"]',
  },
]

// ───────────────── Route matching ─────────────────
function routeMatches(rule, currentPath) {
  if (!rule) return false
  if (rule === currentPath) return true
  if (rule.endsWith('/*')) {
    const prefix = rule.slice(0, -1) // keep trailing slash
    return currentPath.startsWith(prefix)
  }
  return false
}

const contextualFaqs = computed(() => {
  const path = route.path
  return FAQ_CATALOG.filter((f) =>
    f.contextRoutes?.some((r) => routeMatches(r, path)),
  )
})

const secondaryFaqs = computed(() => {
  const ids = new Set(contextualFaqs.value.map((f) => f.id))
  return FAQ_CATALOG.filter((f) => !ids.has(f.id))
})

// ───────────────── Sprite frame styles ─────────────────
// Container is always sized to the TALK footprint and `position` is treated as
// the top-left of that talk footprint. The fly sprite is anchored to the
// container's bottom-center so the bird's feet stay aligned across mode swaps.
const spriteStyle = computed(() => {
  if (spriteMode.value === 'talk') {
    return {
      width: `${TALK_W}px`,
      height: `${TALK_H}px`,
      left: '0px',
      top: '0px',
      backgroundImage: `url(${talkSheet})`,
      backgroundSize: `${TALK_W * FRAME_COUNT}px ${TALK_H}px`,
      backgroundPosition: `${-currentFrame.value * TALK_W}px 0px`,
    }
  }
  const frameForFly = wingsOpenForExit.value ? 1 : currentFrame.value
  return {
    width: `${FLY_W}px`,
    height: `${FLY_H}px`,
    left: `${(TALK_W - FLY_W) / 2}px`,   // negative — fly is wider than talk
    top:  `${TALK_H - FLY_H}px`,         // bottom-aligned within talk footprint
    backgroundImage: `url(${flySheet})`,
    backgroundSize: `${FLY_W * FRAME_COUNT}px ${FLY_H}px`,
    backgroundPosition: `${-frameForFly * FLY_W}px 0px`,
  }
})

const containerStyle = computed(() => ({
  left: `${position.value.x}px`,
  top:  `${position.value.y}px`,
  width:  `${TALK_W}px`,
  height: `${TALK_H}px`,
}))

// ───────────────── Home position persistence ─────────────────
function defaultHomePosition() {
  if (typeof window === 'undefined') return { x: 100, y: 100 }
  return {
    x: window.innerWidth - TALK_W - MARGIN,
    y: window.innerHeight - TALK_H - MARGIN - 20,
  }
}

function loadHomePosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return clampToViewport(parsed.x, parsed.y)
      }
    }
  } catch (_) { /* ignore */ }
  return defaultHomePosition()
}

function saveHomePosition() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position.value))
  } catch (_) { /* ignore */ }
}

function clampToViewport(x, y) {
  if (typeof window === 'undefined') return { x, y }
  return {
    x: Math.max(MARGIN, Math.min(x, window.innerWidth  - TALK_W - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - TALK_H - MARGIN)),
  }
}

function handleResize() {
  position.value = clampToViewport(position.value.x, position.value.y)
  viewportBump.value += 1
  ensureBubbleFits()
}

// If the bubble can't fit either above or below the bird at its current spot,
// slide the bird to a position where it can — using the regular CSS glide so
// it looks like the birdie is "moving out of the way" for the menu.
// Skips during drag/fly so the user's interactions aren't fought.
function ensureBubbleFits() {
  if (typeof window === 'undefined') return
  if (isDragging.value || isFlying.value) return
  if (!showFaqMenu.value && !speechText.value) return

  const needed = estimateBubbleHeight() + 24  // include the 14px gap + safety
  const spaceAbove = position.value.y
  const spaceBelow = window.innerHeight - (position.value.y + TALK_H)

  // Fits where it is — nothing to do
  if (spaceAbove >= needed || spaceBelow >= needed) return

  // Neither side fits. Choose the side with more usable room and move the
  // bird so the bubble can sit fully on that side.
  const preferAbove = spaceAbove >= spaceBelow
  let targetY
  if (preferAbove) {
    // Bird's top edge should be at `needed` from viewport top
    targetY = needed + 4
  } else {
    // Bird's bottom should leave `needed` of space below
    targetY = window.innerHeight - TALK_H - needed - 4
  }
  position.value = clampToViewport(position.value.x, targetY)
}

// Reset on open
watch(() => birdieStore.isOpen, (open) => {
  if (open) {
    spriteMode.value = 'talk'
    currentFrame.value = 0
    facingLeft.value = false
    isFlying.value = false
    isAnimating.value = false
    showFaqMenu.value = false
    showMoreFaqs.value = false
    speechText.value = ''
    displayedSpeech.value = ''
    speechComplete.value = false
    wingsOpenForExit.value = false
    exitClickCount.value = 0
    // Snap to home without transition
    skipTransition.value = true
    position.value = loadHomePosition()
    nextTick(() => {
      requestAnimationFrame(() => { skipTransition.value = false })
    })
    clearTargetHighlight()
  }
})

// React to bubble content changes — if opening the menu or expanding "More"
// would push it off-screen at the current spot, slide the bird to make room.
watch([showFaqMenu, showMoreFaqs, speechText], () => {
  nextTick(() => ensureBubbleFits())
})

// While the user drags the bird, swap to fly mode and animate so it looks like
// it's actually flying instead of being pushed around as the static talk pose.
watch(isDragging, (dragging) => {
  if (dragging) {
    if (exitTimer.value) clearTimeout(exitTimer.value)
    wingsOpenForExit.value = false
    exitClickCount.value = 0
    if (!isFlying.value) {
      spriteMode.value = 'fly'
      startFlyAnimation()
    }
  } else if (!isFlying.value && !wingsOpenForExit.value) {
    stopFlyAnimation()
    spriteMode.value = 'talk'
    currentFrame.value = 0
  }
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  stopTalkAnimation()
  stopFlyAnimation()
  clearAllTimers()
  clearTargetHighlight()
  cleanupDragListeners()
})

function clearAllTimers() {
  if (speechTimer.value)  { clearInterval(speechTimer.value);  speechTimer.value = null }
  if (flightTimer.value)  { clearTimeout(flightTimer.value);   flightTimer.value = null }
  if (exitTimer.value)    { clearTimeout(exitTimer.value);     exitTimer.value = null }
}

// ───────────────── FAQ flow ─────────────────
function openFaq() {
  showFaqMenu.value = true
}
function closeFaq() {
  showFaqMenu.value = false
  showMoreFaqs.value = false
}

async function selectFaq(faq) {
  showFaqMenu.value = false
  showMoreFaqs.value = false
  speechText.value = ''
  displayedSpeech.value = ''
  speechComplete.value = false

  if (faq.route && router.currentRoute.value.path !== faq.route) {
    await router.push(faq.route)
    await new Promise((r) => setTimeout(r, 250))
  }

  await nextTick()
  const targetEl = findTargetEl(faq.target)
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise((r) => setTimeout(r, 350))
    await flyTo(targetEl)
    highlightTarget(targetEl)
  }

  speak(t(faq.answerKey))
}

function findTargetEl(selector) {
  if (!selector) return null
  for (const part of selector.split(',').map((s) => s.trim()).filter(Boolean)) {
    const el = document.querySelector(part)
    if (el) return el
  }
  return null
}

// ───────────────── Highlight target ─────────────────
let highlightedEl = null
function highlightTarget(el) {
  clearTargetHighlight()
  el.classList.add('birdie-target-highlight')
  highlightedEl = el
}
function clearTargetHighlight() {
  if (highlightedEl) {
    highlightedEl.classList.remove('birdie-target-highlight')
    highlightedEl = null
  }
}

// ───────────────── Fly animation ─────────────────
function startFlyAnimation() {
  stopFlyAnimation()
  isAnimating.value = true
  currentFrame.value = 0
  flyFrameTimer.value = setInterval(() => {
    currentFrame.value = (currentFrame.value + 1) % FRAME_COUNT
  }, 110)
}
function stopFlyAnimation() {
  if (flyFrameTimer.value) {
    clearInterval(flyFrameTimer.value)
    flyFrameTimer.value = null
  }
  isAnimating.value = false
}

async function flyTo(targetEl) {
  const rect = targetEl.getBoundingClientRect()
  const placeRight = rect.left > TALK_W + MARGIN * 2
  const talkDestX = placeRight
    ? rect.left - TALK_W - 12
    : rect.right + 12
  let talkDestY = rect.top + rect.height / 2 - TALK_H / 2
  talkDestY = Math.max(MARGIN + 56, Math.min(talkDestY, window.innerHeight - TALK_H - MARGIN))
  const talkDest = clampToViewport(talkDestX, talkDestY)

  const startCenterX = position.value.x + TALK_W / 2
  const destCenterX  = talkDest.x + TALK_W / 2
  facingLeft.value = destCenterX < startCenterX

  const startX = position.value.x
  const startY = position.value.y

  spriteMode.value = 'fly'
  isFlying.value = true
  startFlyAnimation()
  position.value = talkDest

  const distance = Math.hypot(talkDest.x - startX, talkDest.y - startY)
  const duration = Math.min(1600, Math.max(650, distance * 1.4))

  await new Promise((resolve) => {
    flightTimer.value = setTimeout(() => {
      stopFlyAnimation()
      spriteMode.value = 'talk'
      currentFrame.value = 0
      isFlying.value = false
      resolve()
    }, duration)
  })
}

// ───────────────── Talk animation ─────────────────
function startTalkAnimation() {
  stopTalkAnimation()
  isAnimating.value = true
  currentFrame.value = 0
  talkFrameTimer.value = setInterval(() => {
    currentFrame.value = (currentFrame.value + 1) % FRAME_COUNT
  }, 140)
}
function stopTalkAnimation() {
  if (talkFrameTimer.value) {
    clearInterval(talkFrameTimer.value)
    talkFrameTimer.value = null
  }
  isAnimating.value = false
  currentFrame.value = 0
}

function speak(text) {
  speechText.value = text
  displayedSpeech.value = ''
  speechComplete.value = false
  startTalkAnimation()

  let idx = 0
  if (speechTimer.value) clearInterval(speechTimer.value)
  speechTimer.value = setInterval(() => {
    idx += 1
    displayedSpeech.value = text.slice(0, idx)
    if (idx >= text.length) {
      clearInterval(speechTimer.value)
      speechTimer.value = null
      stopTalkAnimation()
      speechComplete.value = true
    }
  }, 28)
}

function dismissSpeech() {
  if (speechTimer.value) { clearInterval(speechTimer.value); speechTimer.value = null }
  stopTalkAnimation()
  speechText.value = ''
  displayedSpeech.value = ''
  speechComplete.value = false
  clearTargetHighlight()
}

// ───────────────── Drag handling ─────────────────
function getPointerPos(event) {
  if (event.touches && event.touches[0]) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  return { x: event.clientX, y: event.clientY }
}

function onPointerDown(event) {
  if (isFlying.value) return
  if (event.button !== undefined && event.button !== 0) return
  const p = getPointerPos(event)
  if (p.x == null || p.y == null) return

  wasDragged.value = false
  dragStart.value = {
    pointerX: p.x,
    pointerY: p.y,
    originX: position.value.x,
    originY: position.value.y,
  }
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', onPointerUp)
  window.addEventListener('touchmove', onPointerMove, { passive: false })
  window.addEventListener('touchend', onPointerUp)
  window.addEventListener('touchcancel', onPointerUp)
}

function onPointerMove(event) {
  if (!dragStart.value) return
  const p = getPointerPos(event)
  if (p.x == null || p.y == null) return
  const dx = p.x - dragStart.value.pointerX
  const dy = p.y - dragStart.value.pointerY

  if (!isDragging.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    isDragging.value = true
    wasDragged.value = true
  }

  if (isDragging.value) {
    if (event.cancelable) event.preventDefault()
    // Flip the bird to face the direction of horizontal motion so it looks like
    // it's actually flying that way while being dragged.
    if (dx < -2) facingLeft.value = true
    else if (dx > 2) facingLeft.value = false
    position.value = clampToViewport(
      dragStart.value.originX + dx,
      dragStart.value.originY + dy,
    )
  }
}

function onPointerUp() {
  if (isDragging.value) {
    saveHomePosition()
  }
  isDragging.value = false
  dragStart.value = null
  cleanupDragListeners()
  // If the bubble's content would be off-screen at the drop position, nudge
  // the bird so the bubble stays usable.
  nextTick(() => ensureBubbleFits())
}

function cleanupDragListeners() {
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('touchend', onPointerUp)
  window.removeEventListener('touchcancel', onPointerUp)
}

// ───────────────── Click handlers ─────────────────
function onBirdieClick(event) {
  if (wasDragged.value) {
    wasDragged.value = false
    event?.preventDefault?.()
    event?.stopPropagation?.()
    return
  }
  if (isFlying.value) return
  exitClickCount.value += 1
  spriteMode.value = 'fly'
  wingsOpenForExit.value = true
  if (exitTimer.value) clearTimeout(exitTimer.value)
  exitTimer.value = setTimeout(() => {
    if (birdieStore.isOpen && exitClickCount.value < 2) {
      wingsOpenForExit.value = false
      spriteMode.value = 'talk'
      currentFrame.value = 0
      exitClickCount.value = 0
    }
  }, 320)
}

function onBirdieDoubleClick() {
  if (wasDragged.value) {
    wasDragged.value = false
    return
  }
  wingsOpenForExit.value = true
  spriteMode.value = 'fly'
  if (exitTimer.value) clearTimeout(exitTimer.value)
  setTimeout(() => {
    closeAssistant()
  }, 220)
}

function closeAssistant() {
  clearAllTimers()
  stopTalkAnimation()
  stopFlyAnimation()
  clearTargetHighlight()
  cleanupDragListeners()
  showFaqMenu.value = false
  showMoreFaqs.value = false
  speechText.value = ''
  displayedSpeech.value = ''
  speechComplete.value = false
  wingsOpenForExit.value = false
  exitClickCount.value = 0
  isDragging.value = false
  birdieStore.close()
}
</script>

<style>
/* Global: highlight class lives outside scoped styles so it applies anywhere */
.birdie-target-highlight {
  position: relative;
  animation: birdiePulse 1.4s ease-in-out infinite;
  box-shadow:
    0 0 0 3px rgba(202, 168, 96, 0.55),
    0 0 24px 6px rgba(202, 168, 96, 0.35) !important;
  border-radius: inherit;
  z-index: 5;
}

@keyframes birdiePulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(202, 168, 96, 0.45), 0 0 16px 4px rgba(202, 168, 96, 0.25); }
  50%      { box-shadow: 0 0 0 5px rgba(202, 168, 96, 0.75), 0 0 28px 10px rgba(202, 168, 96, 0.5); }
}
</style>

<style scoped>
.birdie-assistant {
  position: fixed;
  z-index: 700;
  pointer-events: none;
  transition:
    left 0.9s cubic-bezier(0.45, 0.05, 0.25, 1),
    top  0.9s cubic-bezier(0.45, 0.05, 0.25, 1);
}

.birdie-assistant--no-transition {
  transition: none !important;
}

.birdie-sprite {
  position: absolute;
  left: 0;
  top: 0;
  background-repeat: no-repeat;
  cursor: grab;
  pointer-events: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.55));
  transition: transform 0.25s ease;
  transform-origin: 50% 50%;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.birdie-sprite--flip {
  transform: scaleX(-1);
}

.birdie-sprite--dragging {
  cursor: grabbing;
  transition: none;
}

.birdie-sprite:not(.birdie-sprite--flip):hover {
  transform: translateY(-2px);
}

.birdie-sprite--flip:hover {
  transform: scaleX(-1) translateY(-2px);
}

/* ── Close button ── */
.birdie-close {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 3;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(20, 18, 14, 0.95);
  border: 1px solid rgba(202, 168, 96, 0.45);
  color: var(--Primary);
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}

.birdie-close:hover {
  background: rgba(202, 168, 96, 0.18);
  color: var(--Text);
  border-color: rgba(202, 168, 96, 0.8);
  transform: scale(1.1);
}

/* ── Bubble ── */
/* Default anchor: center. The bubble sits above the bird, centered on it.
   --tail-offset tells the tail where the bird is (in px from the anchored
   edge); it stays pointing at the bird across all anchor variants. */
.birdie-bubble {
  position: absolute;
  bottom: calc(100% + 14px);
  min-width: 64px;
  max-width: 320px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #161310 0%, #1f1a13 100%);
  border: 1px solid rgba(202, 168, 96, 0.55);
  border-radius: 14px;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(202, 168, 96, 0.18) inset;
  color: var(--Text);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.45;
  pointer-events: auto;
  z-index: 2;
}

/* Anchor variants — only one is active at a time */
.birdie-bubble--anchor-center {
  left: 50%;
  transform: translateX(-50%);
}

.birdie-bubble--anchor-left {
  left: 0;
}

.birdie-bubble--anchor-right {
  right: 0;
}

.birdie-bubble--wide {
  min-width: 240px;
}

.birdie-bubble--below {
  bottom: auto;
  top: calc(100% + 14px);
}

.birdie-bubble--clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.birdie-bubble--clickable.birdie-bubble--anchor-center:hover {
  transform: translateX(-50%) translateY(-2px);
}
.birdie-bubble--clickable.birdie-bubble--anchor-left:hover,
.birdie-bubble--clickable.birdie-bubble--anchor-right:hover {
  transform: translateY(-2px);
}
.birdie-bubble--clickable:hover {
  border-color: rgba(202, 168, 96, 0.85);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(202, 168, 96, 0.35) inset,
    0 0 18px rgba(202, 168, 96, 0.25);
}

.birdie-bubble--clickable:hover .birdie-bubble-q {
  background: rgba(202, 168, 96, 0.18);
  color: var(--Text);
  transform: scale(1.08);
}

/* Tail — points down toward the bird by default. Position adapts to each
   anchor variant so the tail always lands above the bird's center. */
.birdie-bubble-tail {
  position: absolute;
  bottom: -7px;
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #161310 0%, #1f1a13 100%);
  border-right: 1px solid rgba(202, 168, 96, 0.55);
  border-bottom: 1px solid rgba(202, 168, 96, 0.55);
  transform: rotate(45deg);
}

.birdie-bubble--anchor-center .birdie-bubble-tail {
  left: 50%;
  margin-left: -6px;
}

.birdie-bubble--anchor-left .birdie-bubble-tail {
  left: calc(62px - 6px);  /* TALK_W/2 minus half the tail width */
}

.birdie-bubble--anchor-right .birdie-bubble-tail {
  right: calc(62px - 6px);
}

.birdie-bubble--below .birdie-bubble-tail {
  bottom: auto;
  top: -7px;
  border-right: none;
  border-bottom: none;
  border-left: 1px solid rgba(202, 168, 96, 0.55);
  border-top: 1px solid rgba(202, 168, 96, 0.55);
}

.birdie-bubble-q {
  font-family: 'Bungee', 'Manrope', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--Primary);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s, transform 0.15s, color 0.15s;
  user-select: none;
}

/* ── FAQ ── */
.birdie-faq-title {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--Primary);
}

.birdie-faq-section + .birdie-faq-toggle,
.birdie-faq-empty + .birdie-faq-toggle {
  margin-top: 4px;
}

.birdie-faq-section-title {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--TextDim);
}

.birdie-faq-section {
  margin-bottom: 8px;
}

.birdie-faq-empty {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--TextMuted);
  font-style: italic;
}

.birdie-faq-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}

.birdie-faq-list::-webkit-scrollbar {
  width: 6px;
}
.birdie-faq-list::-webkit-scrollbar-thumb {
  background: rgba(202, 168, 96, 0.35);
  border-radius: 6px;
}

.birdie-faq-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--Text);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.birdie-faq-item:hover {
  background: rgba(202, 168, 96, 0.12);
  border-color: rgba(202, 168, 96, 0.4);
  color: var(--Primary);
}

.birdie-faq-toggle {
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(202, 168, 96, 0.3);
  border-radius: 8px;
  padding: 6px;
  margin-bottom: 8px;
  font-family: inherit;
  font-size: 11px;
  color: var(--Primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.birdie-faq-toggle:hover {
  background: rgba(202, 168, 96, 0.08);
  border-color: rgba(202, 168, 96, 0.55);
  color: var(--Text);
}

.birdie-faq-toggle-icon {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.birdie-faq-close {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--TextMuted);
  padding: 6px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.birdie-faq-close:hover {
  color: var(--Text);
  border-color: rgba(255, 255, 255, 0.25);
}

/* ── Speech ── */
.birdie-speech-text {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--Text);
  white-space: pre-wrap;
}

.birdie-speech-ok {
  display: block;
  margin-left: auto;
  background: rgba(202, 168, 96, 0.15);
  border: 1px solid rgba(202, 168, 96, 0.45);
  color: var(--Primary);
  padding: 5px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.birdie-speech-ok:hover {
  background: rgba(202, 168, 96, 0.3);
  color: var(--Text);
}

/* ── Bubble enter/leave ── */
.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.92);
}
</style>
