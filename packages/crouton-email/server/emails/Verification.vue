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

const props = withDefaults(defineProps<Props>(), {
  name: '',
  expiryMinutes: 10,
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: '',
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
        fontSize: '16px',
        lineHeight: '24px',
        color: '#525f7f',
        margin: '0 0 16px',
      }"
    >
      Hi{{ name ? ` ${name}` : '' }},
    </EText>

    <EText
      :style="{
        fontSize: '16px',
        lineHeight: '24px',
        color: '#525f7f',
        margin: '0 0 24px',
      }"
    >
      Please use the following verification code to complete your request:
    </EText>

    <ESection
      :style="{
        backgroundColor: '#f4f4f5',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        margin: '0 0 24px',
      }"
    >
      <EText
        :style="{
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '4px',
          color: primaryColor,
          margin: '0',
          fontFamily: 'monospace',
        }"
      >
        {{ code }}
      </EText>
    </ESection>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0 0 16px',
      }"
    >
      This code will expire in {{ expiryMinutes }} minutes.
    </EText>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0',
      }"
    >
      If you didn't request this code, you can safely ignore this email.
      Someone might have typed your email address by mistake.
    </EText>
  </BaseLayout>
</template>
