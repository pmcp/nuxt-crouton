<script setup lang="ts">
import { EText, EButton, ESection } from 'vue-email'
import BaseLayout from './BaseLayout.vue'

interface Props {
  link: string
  inviterName: string
  teamName: string
  role?: string
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  role: 'member',
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: ''
})

const previewText = props.preview || `${props.inviterName} invited you to join ${props.teamName}`
</script>

<template>
  <BaseLayout
    :preview="previewText"
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
      <strong>{{ inviterName }}</strong> has invited you to join
      <strong>{{ teamName }}</strong>
      <template v-if="role && role !== 'member'">
        as {{ role === 'admin' ? 'an' : 'a' }} <strong>{{ role }}</strong>
      </template>
      on {{ brandName }}.
    </EText>

    <ESection :style="{ margin: '0 0 24px' }">
      <EButton
        :href="link"
        :style="{
          backgroundColor: primaryColor,
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          textDecoration: 'none',
          textAlign: 'center',
          display: 'inline-block',
          padding: '12px 24px'
        }"
      >
        Join {{ teamName }}
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
      If you weren't expecting this invitation, you can safely ignore this email.
    </EText>
  </BaseLayout>
</template>
