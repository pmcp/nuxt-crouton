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
  EHr,
} from 'vue-email'

interface Props {
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  preview: '',
  brandName: 'My App',
  logoUrl: '',
  primaryColor: '#0F766E',
  appUrl: '',
})
</script>

<template>
  <EHtml lang="en">
    <EHead />
    <EPreview v-if="preview">{{ preview }}</EPreview>
    <EBody
      :style="{
        backgroundColor: '#f6f9fc',
        fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif',
      }"
    >
      <EContainer
        :style="{
          backgroundColor: '#ffffff',
          margin: '40px auto',
          padding: '20px 0 48px',
          borderRadius: '8px',
          maxWidth: '600px',
        }"
      >
        <!-- Header -->
        <ESection :style="{ padding: '0 48px' }">
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
              margin: '0 0 24px',
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
        <ESection :style="{ padding: '0 48px' }">
          <EHr
            :style="{
              borderColor: '#e6ebf1',
              margin: '32px 0',
            }"
          />
          <EText
            :style="{
              fontSize: '12px',
              color: '#8898aa',
              textAlign: 'center',
              margin: '0',
            }"
          >
            {{ brandName }}
            <template v-if="appUrl">
              &bull;
              <a
                :href="appUrl"
                :style="{ color: '#8898aa', textDecoration: 'underline' }"
              >
                {{ appUrl.replace(/^https?:\/\//, '') }}
              </a>
            </template>
          </EText>
          <EText
            :style="{
              fontSize: '12px',
              color: '#8898aa',
              textAlign: 'center',
              margin: '8px 0 0',
            }"
          >
            You received this email because you have an account with us.
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
