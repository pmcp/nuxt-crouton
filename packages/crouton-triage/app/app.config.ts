export default defineAppConfig({
  // App auto-discovery registration for crouton-triage
  croutonApps: {
    triage: {
      id: 'triage',
      name: 'Triage',
      icon: 'i-lucide-funnel',
      dashboardRoutes: [],
      // Admin routes (appear in /admin/[team]/ sidebar)
      adminRoutes: [
        {
          path: '/triage',
          label: 'triage.admin.overview',
          icon: 'i-lucide-activity'
        },
        {
          path: '/triage/discussions',
          label: 'triage.admin.discussions',
          icon: 'i-lucide-message-square'
        },
        {
          path: '/triage/tasks',
          label: 'triage.admin.tasks',
          icon: 'i-lucide-check-square'
        },
        {
          path: '/triage/jobs',
          label: 'triage.admin.jobs',
          icon: 'i-lucide-activity'
        },
        {
          path: '/triage/user-mappings',
          label: 'triage.admin.userMappings',
          icon: 'i-lucide-users'
        },
        {
          path: '/triage/inbox',
          label: 'triage.admin.inbox',
          icon: 'i-lucide-inbox'
        }
      ],
      // Settings routes
      settingsRoutes: [],
      // Page types for CMS integration
      pageTypes: [
        {
          id: 'triage-feed',
          name: 'Triage Feed',
          description: 'Discussion triage activity feed with pipeline configuration',
          icon: 'i-lucide-activity',
          component: 'CroutonTriagePanel',
          category: 'admin',
          preferredLayout: 'full-height'
        }
      ]
    }
  }
})
