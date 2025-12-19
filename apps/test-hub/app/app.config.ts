import { blogPostsConfig } from '../layers/blog/collections/posts/app/composables/useBlogPosts'

export default defineAppConfig({
  croutonCollections: {
    blogPosts: blogPostsConfig,
  }
})
