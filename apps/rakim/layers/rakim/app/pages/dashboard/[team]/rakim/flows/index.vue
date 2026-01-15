<script setup lang="ts">
// Flows is now the main dashboard - redirect there
const { currentTeam } = useTeam()

definePageMeta({
  middleware: 'auth'
})

// Redirect to main dashboard
navigateTo(`/dashboard/${currentTeam.value?.slug}`)
</script>