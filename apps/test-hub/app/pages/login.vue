<script setup lang="ts">
definePageMeta({
  title: 'Login',
  layout: false
})

const { signIn } = useAuth()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)

async function handleLogin(data: { email: string; password: string }) {
  loading.value = true
  error.value = null

  try {
    await signIn.email({
      email: data.email,
      password: data.password
    })
    // Redirect to dashboard on success
    router.push('/dashboard/posts')
  } catch (e: any) {
    error.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-center mb-8">Login</h1>
      <AuthLoginForm
        :loading="loading"
        :error="error"
        @submit="handleLogin"
      />
      <p class="mt-4 text-center text-sm text-muted">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>