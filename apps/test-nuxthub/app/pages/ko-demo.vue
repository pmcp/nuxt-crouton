<script setup lang="ts">
// Interactive state for knobs
const knobValue1 = ref(50)
const knobValue2 = ref(75)
const knobValue3 = ref(25)

// Toggle for LED demo
const ledActive = ref(false)
</script>

<template>
  <div class="min-h-screen p-8" style="background-color: var(--ko-surface-light);">
    <!-- Header -->
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold" style="color: var(--ko-text-dark);">
          KO Theme Demo
        </h1>
        <NuxtLink to="/">
          <UButton variant="ghost" size="sm">
            Back
          </UButton>
        </NuxtLink>
      </div>

      <!-- LED Section -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          LED Indicators
        </h2>
        <div class="p-6 rounded-lg" style="background-color: var(--ko-surface-panel);">
          <!-- LED States -->
          <div class="mb-6">
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-muted);">
              States (Orange)
            </p>
            <div class="flex items-center gap-6">
              <div class="text-center">
                <KoLed state="off" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">off</span>
              </div>
              <div class="text-center">
                <KoLed state="on" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">on</span>
              </div>
              <div class="text-center">
                <KoLed state="blink" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">blink</span>
              </div>
              <div class="text-center">
                <KoLed state="fast" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">fast</span>
              </div>
              <div class="text-center">
                <KoLed state="pulse" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">pulse</span>
              </div>
              <div class="text-center">
                <KoLed state="alive" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">alive</span>
              </div>
            </div>
          </div>

          <!-- LED Colors -->
          <div>
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-muted);">
              Colors (On State)
            </p>
            <div class="flex items-center gap-6">
              <div class="text-center">
                <KoLed state="on" color="orange" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">orange</span>
              </div>
              <div class="text-center">
                <KoLed state="on" color="red" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">red</span>
              </div>
              <div class="text-center">
                <KoLed state="on" color="blue" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">blue</span>
              </div>
              <div class="text-center">
                <KoLed state="on" color="green" size="lg" />
                <span class="block text-xs mt-2" style="color: var(--ko-text-label);">green</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Knobs Section -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Rotary Knobs
        </h2>
        <p class="text-sm" style="color: var(--ko-text-label);">
          Drag up/down to adjust values
        </p>
        <div class="p-6 rounded-lg flex items-end gap-8" style="background-color: var(--ko-surface-panel);">
          <div class="text-center">
            <KoKnob v-model="knobValue1" :min="0" :max="100" size="lg" />
            <KoDisplay :value="knobValue1" label="Volume" class="mt-4" />
          </div>
          <div class="text-center">
            <KoKnob v-model="knobValue2" :min="0" :max="100" size="md" color="orange" />
            <KoDisplay :value="knobValue2" label="Pan" class="mt-4" />
          </div>
          <div class="text-center">
            <KoKnob v-model="knobValue3" :min="0" :max="100" size="sm" />
            <KoDisplay :value="knobValue3" label="Tone" class="mt-4" />
          </div>
        </div>
      </section>

      <!-- Buttons Section -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Tactile Buttons
        </h2>
        <div class="p-6 rounded-lg" style="background-color: var(--ko-surface-mid);">
          <!-- Color Variants -->
          <div class="mb-6">
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-muted);">
              Variants
            </p>
            <div class="flex flex-wrap items-center gap-4">
              <KoButton variant="default">
                Default
              </KoButton>
              <KoButton variant="orange">
                Orange
              </KoButton>
              <KoButton variant="dark">
                Dark
              </KoButton>
              <KoButton variant="red">
                Red
              </KoButton>
              <KoButton variant="pink">
                Pink
              </KoButton>
              <KoButton variant="blue">
                Blue
              </KoButton>
            </div>
          </div>

          <!-- Shapes -->
          <div class="mb-6">
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-muted);">
              Shapes
            </p>
            <div class="flex items-center gap-4">
              <KoButton shape="square" variant="orange">
                SQ
              </KoButton>
              <KoButton shape="rect" variant="dark">
                RECT
              </KoButton>
              <KoButton shape="wide" variant="blue">
                WIDE BUTTON
              </KoButton>
            </div>
          </div>

          <!-- With LED -->
          <div>
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-muted);">
              With LED Indicator
            </p>
            <div class="flex items-center gap-4">
              <KoButton variant="dark" @click="ledActive = !ledActive">
                <template #default>
                  REC
                </template>
                <template #led>
                  <KoLed :state="ledActive ? 'on' : 'off'" color="red" size="sm" />
                </template>
              </KoButton>
              <KoButton variant="default">
                <template #default>
                  PLAY
                </template>
                <template #led>
                  <KoLed state="blink" color="green" size="sm" />
                </template>
              </KoButton>
            </div>
          </div>
        </div>
      </section>

      <!-- Panel & Display Section -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Panels & Displays
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <KoPanel>
            <div class="flex items-center gap-4">
              <KoLed state="alive" color="orange" />
              <span>Dark Panel with Glass</span>
            </div>
          </KoPanel>
          <KoPanel :dark="false" :glass="false">
            <div class="flex items-center gap-4">
              <KoLed state="on" color="blue" />
              <span>Light Panel</span>
            </div>
          </KoPanel>
        </div>
      </section>

      <!-- Labels Section -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Labels
        </h2>
        <div class="p-6 rounded-lg flex gap-8" style="background-color: var(--ko-surface-panel);">
          <div>
            <KoLabel>Default Label</KoLabel>
            <div class="w-16 h-16 rounded" style="background-color: var(--ko-surface-mid);" />
          </div>
          <div>
            <KoLabel variant="orange">Orange Label</KoLabel>
            <div class="w-16 h-16 rounded" style="background-color: var(--ko-surface-mid);" />
          </div>
          <div>
            <KoLabel variant="dark">Dark Label</KoLabel>
            <div class="w-16 h-16 rounded" style="background-color: var(--ko-surface-mid);" />
          </div>
        </div>
      </section>

      <!-- Decorative Elements -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Decorative Elements
        </h2>
        <div class="p-6 rounded-lg flex items-start gap-8" style="background-color: var(--ko-surface-mid);">
          <!-- Punch Holes -->
          <div>
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-label);">
              Punch Holes
            </p>
            <div class="flex items-center gap-4" style="color: var(--ko-surface-dark);">
              <KoPunchHole size="sm" />
              <KoPunchHole size="md" />
              <KoPunchHole size="lg" />
            </div>
          </div>

          <!-- Speaker Grill -->
          <div>
            <p class="text-xs uppercase tracking-wide mb-3" style="color: var(--ko-text-label);">
              Speaker Grill
            </p>
            <div style="color: var(--ko-surface-dark);">
              <KoSpeakerGrill :rows="6" :cols="8" />
            </div>
          </div>
        </div>
      </section>

      <!-- Nuxt UI Integration -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold" style="color: var(--ko-text-dark);">
          Nuxt UI with KO Variant
        </h2>
        <div class="p-6 rounded-lg space-y-4" style="background-color: var(--ko-surface-panel);">
          <div class="flex gap-4">
            <UButton variant="ko" color="primary">
              Primary (Orange)
            </UButton>
            <UButton variant="ko" color="neutral">
              Neutral (Dark)
            </UButton>
            <UButton variant="ko" color="error">
              Error (Red)
            </UButton>
          </div>
          <div class="max-w-xs">
            <UInput variant="ko" placeholder="LCD Input Style" />
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="text-center py-8">
        <p class="text-sm" style="color: var(--ko-text-label);">
          KO Theme - Inspired by Teenage Engineering KO II
        </p>
      </div>
    </div>
  </div>
</template>
