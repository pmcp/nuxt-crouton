<script setup lang="ts">
import { EText, EButton, ESection } from 'vue-email'
import BaseLayout from './BaseLayout.vue'

interface Props {
  name: string
  getStartedLink?: string
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  getStartedLink: '',
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: '',
})

const previewText = props.preview || `Welcome to ${props.brandName}!`
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
        fontSize: '24px',
        fontWeight: '600',
        color: primaryColor,
        textAlign: 'center',
        margin: '0 0 24px',
      }"
    >
      Welcome to {{ brandName }}!
    </EText>

    <EText
      :style="{
        fontSize: '16px',
        lineHeight: '24px',
        color: '#525f7f',
        margin: '0 0 16px',
      }"
    >
      Hi {{ name }},
    </EText>

    <EText
      :style="{
        fontSize: '16px',
        lineHeight: '24px',
        color: '#525f7f',
        margin: '0 0 24px',
      }"
    >
      Thank you for creating an account. We're excited to have you on board!
    </EText>

    <ESection
      v-if="getStartedLink"
      :style="{ textAlign: 'center', margin: '0 0 24px' }"
    >
      <EButton
        :href="getStartedLink"
        :style="{
          backgroundColor: primaryColor,
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          textDecoration: 'none',
          textAlign: 'center',
          display: 'inline-block',
          padding: '12px 24px',
        }"
      >
        Get Started
      </EButton>
    </ESection>

    <ESection
      :style="{
        backgroundColor: '#f4f4f5',
        borderRadius: '8px',
        padding: '20px',
        margin: '0 0 24px',
      }"
    >
      <EText
        :style="{
          fontSize: '14px',
          fontWeight: '600',
          color: '#525f7f',
          margin: '0 0 12px',
        }"
      >
        Here's what you can do next:
      </EText>
      <EText
        :style="{
          fontSize: '14px',
          lineHeight: '22px',
          color: '#525f7f',
          margin: '0',
        }"
      >
        &bull; Complete your profile<br>
        &bull; Explore the dashboard<br>
        &bull; Invite your team members
      </EText>
    </ESection>

    <EText
      :style="{
        fontSize: '14px',
        lineHeight: '20px',
        color: '#8898aa',
        margin: '0',
      }"
    >
      If you have any questions, feel free to reply to this email.
      We're here to help!
    </EText>
  </BaseLayout>
</template>
