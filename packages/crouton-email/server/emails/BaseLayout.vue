<script setup lang="ts">
import {
  EHtml,
  EHead,
  EPreview,
  EBody,
  EContainer,
  ESection,
  EImg,
  EText,
  EHr
} from 'vue-email'

interface Props {
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

withDefaults(defineProps<Props>(), {
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: ''
})
</script>

<template>
  <EHtml lang="en">
    <EHead />
    <EPreview v-if="preview">
      {{ preview }}
    </EPreview>
    <EBody
      :style="{
        backgroundColor: '#f6f9fc',
        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif'
      }"
    >
      <EContainer
        :style="{
          backgroundColor: '#ffffff',
          margin: '40px auto',
          padding: '0',
          borderRadius: '8px',
          maxWidth: '600px',
          border: '1px solid #e6ebf1',
          overflow: 'hidden'
        }"
      >
        <!-- Top accent bar -->
        <ESection
          :style="{
            height: '4px',
            backgroundColor: primaryColor,
            margin: '0',
            padding: '0'
          }"
        />

        <!-- Header -->
        <ESection :style="{ padding: '32px 48px 0' }">
          <EImg
            v-if="logoUrl"
            :src="logoUrl"
            :alt="brandName"
            width="120"
            height="40"
            :style="{ margin: '0 auto 24px', display: 'block' }"
          />
          <EText
            v-else
            :style="{
              fontSize: '24px',
              fontWeight: '600',
              color: primaryColor,
              textAlign: 'center',
              margin: '0 0 24px'
            }"
          >
            {{ brandName }}
          </EText>
        </ESection>

        <!-- Main Content -->
        <ESection :style="{ padding: '0 48px' }">
          <slot />
        </ESection>

        <!-- Footer -->
        <ESection :style="{ padding: '0 48px 32px' }">
          <EHr
            :style="{
              borderColor: '#e6ebf1',
              margin: '32px 0 24px'
            }"
          />
          <EText
            :style="{
              fontSize: '12px',
              color: '#8898aa',
              textAlign: 'center',
              margin: '0'
            }"
          >
            {{ brandName }}
          </EText>
          <EText
            v-if="appUrl"
            :style="{
              fontSize: '12px',
              color: '#b0b8c4',
              textAlign: 'center',
              margin: '4px 0 0'
            }"
          >
            <a
              :href="appUrl"
              :style="{ color: '#b0b8c4', textDecoration: 'none' }"
            >
              {{ appUrl.replace(/^https?:\/\//, '') }}
            </a>
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
