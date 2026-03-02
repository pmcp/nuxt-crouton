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

withDefaults(defineProps<Props>(), {
  name: '',
  expiryMinutes: 10,
  preview: 'Verify your email address',
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
        fontSize: '14px',
        lineHeight: '24px',
        color: '#0a0a0a',
        margin: '0 0 24px'
      }"
    >
      Hi{{ name ? ` ${name}` : '' }},<br><br>
      Please verify your email address by clicking the link below.
    </EText>

    <ESection :style="{ margin: '0 0 24px' }">
      <EButton
        :href="link"
        :style="{
          backgroundColor: '#0a0a0a',
          borderRadius: '4px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
          textAlign: 'center',
          display: 'inline-block',
          padding: '10px 20px'
        }"
      >
        Verify email
      </EButton>
    </ESection>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '24px',
        color: '#0a0a0a',
        margin: '0 0 24px'
      }"
    >
      Or copy this URL into your browser:<br>
      <a
        :href="link"
        :style="{
          color: primaryColor,
          textDecoration: 'none',
          wordBreak: 'break-all'
        }"
      >{{ link }}</a>
    </EText>

    <EText
      :style="{
        fontSize: '12px',
        lineHeight: '20px',
        color: '#a3a3a3',
        margin: '0'
      }"
    >
      This link expires in {{ expiryMinutes }} minutes. If you didn't
      create an account, you can safely ignore this email.
    </EText>
  </BaseLayout>
</template>
