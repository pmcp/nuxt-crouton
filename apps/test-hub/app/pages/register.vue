<script setup lang="ts">
definePageMeta({
  title: 'Register',
  layout: false
})

const { signUp } = useAuth()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)

async function handleRegister(data: { name: string; email: string; password: string }) {
  loading.value = true
  error.value = null

  try {
    await signUp.email({
      name: data.name,
      email: data.email,
      password: data.password
    })
    // Redirect to dashboard on success
    router.push('/dashboard/posts')
  } catch (e: any) {
    error.value = e.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-center mb-8">Register</h1>
      <AuthRegisterForm
        :loading="loading"
        :error="error"
        @submit="handleRegister"
      />
      <p class="mt-4 text-center text-sm text-muted">
        Already have an account?
        <NuxtLink to="/login" class="text-primary">Login</NuxtLink>
      </p>
    </div>
  </div>
</template>