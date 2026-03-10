<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Tot nu toe — Alex Deforce'
})
</script>

<template>
  <div>
    <h1 class="pb-5 pt-1"><span class="text-xl">Tot nu toe</span></h1>
    <iframe
      style="border-radius: 12px"
      src="https://open.spotify.com/embed/album/23rgHj3WEwtHO9JrenobI6?utm_source=generator&theme=0"
      width="100%"
      height="352"
      frameborder="0"
      allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
    <iframe
      style="border: 0; width: 350px; height: 786px"
      src="https://bandcamp.com/EmbeddedPlayer/album=483586816/size=large/bgcol=ffffff/linkcol=0687f5/transparent=true/"
      seamless
    />
  </div>
</template>
