<script setup lang="ts">
import { EText, EButton, ESection } from 'vue-email'
import BaseLayout from './BaseLayout.vue'

interface Props {
  link: string
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
  preview: 'Click to sign in to your account',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: ''
})
</script>

<template>
  <BaseLayout
    :preview="preview"
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
        margin: '0 0 16px'
      }"
    >
      Hi{{ name ? ` ${name}` : '' }},
    </EText>

    <EText
      :style="{
        fontSize: '16px',
        lineHeight: '24px',
        color: '#525f7f',
        margin: '0 0 24px'
      }"
    >
      Click the button below to sign in to your {{ brandName }} account.
      No password needed!
    </EText>

    <ESection :style="{ textAlign: 'center', margin: '0 0 24px' }">
      <EButton
        :href="link"
        :style="{
          backgroundColor: primaryColor,
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          textDecoration: 'none',
          textAlign: 'center',
          display: 'inline-block',
          padding: '12px 24px'
        }"
      >
        Sign in to {{ brandName }}
      </EButton>
    </ESection>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0 0 16px'
      }"
    >
      This link will expire in {{ expiryMinutes }} minutes.
    </EText>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0 0 16px'
      }"
    >
      If the button doesn't work, copy and paste this link into your browser:
    </EText>

    <EText
      :style="{
        fontSize: '12px',
        lineHeight: '16px',
        color: '#8898aa',
        wordBreak: 'break-all',
        margin: '0 0 24px'
      }"
    >
      {{ link }}
    </EText>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0'
      }"
    >
      If you didn't request this link, you can safely ignore this email.
    </EText>
  </BaseLayout>
</template>
