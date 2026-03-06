<template>
  <div id="mainGrid" class="pt-2 md:px-5 md:pt-5 w-full text-sm">
    <header class="flex sticky top-5 bg-white z-20 overflow-x-hidden">
      <SiteNav />
    </header>
    <aside class="w-full md:pt-0 left-0 bg-white z-10 mb-4">
      <SiteSidebar />
    </aside>
    <main class="px-2 md:px-0 mt-7 w-full">
      <slot />
    </main>
  </div>
</template>
