<script setup lang="ts">
import { EText, ESection } from 'vue-email'
import BaseLayout from './BaseLayout.vue'

interface Props {
  code: string
  name?: string
  expiryMinutes: number
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

withDefaults(defineProps<Props>(), {
  name: '',
  expiryMinutes: 10,
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: ''
})
</script>

<template>
  <BaseLayout
    :preview="preview || `Your verification code is ${code}`"
    :brand-name="brandName"
    :logo-url="logoUrl"
    :primary-color="primaryColor"
    :app-url="appUrl"
  >
    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '24px',
        color: '#0a0a0a',
        margin: '0 0 24px'
      }"
    >
      Hi{{ name ? ` ${name}` : '' }},<br><br>
      Your verification code is below.
    </EText>

    <ESection
      :style="{
        textAlign: 'center',
        margin: '0 0 24px'
      }"
    >
      <EText
        :style="{
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '4px',
          color: '#0a0a0a',
          margin: '16px 0',
          fontFamily: '\'SF Mono\', \'Fira Code\', \'Fira Mono\', \'Roboto Mono\', \'Courier New\', monospace'
        }"
      >
        {{ code }}
      </EText>
    </ESection>

    <EText
      :style="{
        fontSize: '12px',
        lineHeight: '20px',
        color: '#a3a3a3',
        margin: '0'
      }"
    >
      This code expires in {{ expiryMinutes }} minutes. If you didn't
      request this, you can safely ignore this email.
    </EText>
  </BaseLayout>
</template>
