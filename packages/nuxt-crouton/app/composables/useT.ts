/**
 * Stub translation composable for base nuxt-crouton layer
 *
 * Provides English fallbacks for standalone usage.
 * When nuxt-crouton-i18n layer is installed (and listed AFTER this layer),
 * its useT will override this stub via Nuxt's layer precedence.
 *
 * This is progressive enhancement:
 * - Without i18n layer: English fallbacks from this stub
 * - With i18n layer: Full translation support with team overrides
 */
export function useT() {
  const fallbacks: Record<string, string> = {
    // ===================
    // COMMON (~50 keys)
    // ===================
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.submit': 'Submit',
    'common.reset': 'Reset',
    'common.refresh': 'Refresh',
    'common.view': 'View',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.select': 'Select',
    'common.selectAll': 'Select All',
    'common.unselectAll': 'Unselect All',
    'common.actions': 'Actions',
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',
    'common.deleting': 'Deleting...',
    'common.noResults': 'No results found',
    'common.noData': 'No data available',
    'common.required': 'Required',
    'common.optional': 'Optional',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.none': 'None',
    'common.selected': 'Selected',
    'common.more': 'More',
    'common.less': 'Less',
    'common.showMore': 'Show more',
    'common.showLess': 'Show less',
    'common.viewAll': 'View all',
    'common.saveChanges': 'Save Changes',
    'common.proceed': 'Proceed',
    'common.change': 'Change',

    // ===================
    // TABLE (~25 keys)
    // ===================
    'table.id': 'ID',
    'table.createdAt': 'Created At',
    'table.updatedAt': 'Updated At',
    'table.createdBy': 'Created By',
    'table.updatedBy': 'Updated By',
    'table.actions': 'Actions',
    'table.rowsPerPage': 'Rows per page',
    'table.rowsPerPageColon': 'Rows per page:',
    'table.page': 'Page',
    'table.of': 'of',
    'table.items': 'items',
    'table.results': 'results',
    'table.selected': 'selected',
    'table.total': 'Total',
    'table.showing': 'Showing',
    'table.to': 'to',
    'table.from': 'from',
    'table.first': 'First',
    'table.last': 'Last',
    'table.noResults': 'No results found',
    'table.sortAscending': 'Sort ascending',
    'table.sortDescending': 'Sort descending',
    'table.display': 'Display',
    'table.selectAll': 'Select all',
    'table.selectRow': 'Select row',
    'table.search': 'Search',

    // ===================
    // FORMS (~30 keys)
    // ===================
    'forms.name': 'Name',
    'forms.description': 'Description',
    'forms.status': 'Status',
    'forms.active': 'Active',
    'forms.inactive': 'Inactive',
    'forms.date': 'Date',
    'forms.time': 'Time',
    'forms.startDate': 'Start Date',
    'forms.endDate': 'End Date',
    'forms.notes': 'Notes',
    'forms.address': 'Address',
    'forms.phone': 'Phone',
    'forms.mobile': 'Mobile',
    'forms.fax': 'Fax',
    'forms.website': 'Website',
    'forms.company': 'Company',
    'forms.firstName': 'First Name',
    'forms.lastName': 'Last Name',
    'forms.fullName': 'Full Name',
    'forms.country': 'Country',
    'forms.city': 'City',
    'forms.state': 'State',
    'forms.zipCode': 'Zip Code',
    'forms.postalCode': 'Postal Code',
    'forms.language': 'Language',
    'forms.timezone': 'Timezone',
    'forms.currency': 'Currency',
    'forms.category': 'Category',
    'forms.translations': 'Translations',

    // ===================
    // ERRORS (~15 keys)
    // ===================
    'errors.generic': 'Something went wrong',
    'errors.notFound': 'Not found',
    'errors.unauthorized': 'Unauthorized',
    'errors.forbidden': 'Access denied',
    'errors.serverError': 'Server error',
    'errors.networkError': 'Network error',
    'errors.validationError': 'Validation error',
    'errors.requiredField': 'This field is required',
    'errors.invalidEmail': 'Invalid email address',
    'errors.invalidPassword': 'Invalid password',
    'errors.passwordMismatch': 'Passwords do not match',
    'errors.minLength': 'Must be at least {min} characters',
    'errors.maxLength': 'Must be at most {max} characters',
    'errors.tryAgain': 'Please try again',
    'errors.contactSupport': 'Please contact support if the problem persists',

    // ===================
    // SUCCESS (~6 keys)
    // ===================
    'success.saved': 'Saved successfully',
    'success.created': 'Created successfully',
    'success.updated': 'Updated successfully',
    'success.deleted': 'Deleted successfully',
    'success.sent': 'Sent successfully',
    'success.copied': 'Copied to clipboard',

    // ===================
    // CONFIRMATION (~6 keys)
    // ===================
    'confirmation.areYouSure': 'Are you sure?',
    'confirmation.deleteConfirm': 'Are you sure you want to delete this?',
    'confirmation.leaveConfirm': 'Are you sure you want to leave?',
    'confirmation.unsavedChanges': 'You have unsaved changes',
    'confirmation.discardChanges': 'Discard changes?',
    'confirmation.cannotUndo': 'This action cannot be undone',

    // ===================
    // TIME (~10 keys)
    // ===================
    'time.now': 'Now',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.tomorrow': 'Tomorrow',
    'time.thisWeek': 'This week',
    'time.lastWeek': 'Last week',
    'time.thisMonth': 'This month',
    'time.lastMonth': 'Last month',
    'time.ago': '{time} ago',
    'time.in': 'in {time}',

    // ===================
    // AUTH (~30 keys)
    // For crouton-auth package
    // ===================
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signUp': 'Sign Up',
    'auth.login': 'Log In',
    'auth.logout': 'Log Out',
    'auth.register': 'Register',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',
    'auth.changePassword': 'Change Password',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.rememberMe': 'Remember me',
    'auth.orContinueWith': 'Or continue with',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.createAccount': 'Create Account',
    'auth.username': 'Username',
    'auth.verifyEmail': 'Verify your email',
    'auth.currentPassword': 'Current password',
    'auth.newPassword': 'New password',
    'auth.getStarted': 'Get Started',
    'auth.phoneNumber': 'Phone Number',
    'auth.loginWithMagicLink': 'Login with Magic Link',
    'auth.loginWithPasskey': 'Login with Passkey',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.sendMagicLink': 'Send Magic Link',
    'auth.checkYourInbox': 'Check your inbox',
    'auth.backToSignIn': 'Back to Sign In',
    'auth.verify': 'Verify',

    // ===================
    // ACCOUNT (~15 keys)
    // For account settings
    // ===================
    'account.settings': 'Account Settings',
    'account.profile': 'Profile',
    'account.security': 'Security',
    'account.linkedAccounts': 'Linked Accounts',
    'account.dangerZone': 'Danger Zone',
    'account.deleteAccount': 'Delete Account',
    'account.updateProfile': 'Update Profile',
    'account.updatePassword': 'Update Password',
    'account.twoFactorAuth': 'Two-Factor Authentication',
    'account.enable2FA': 'Enable 2FA',
    'account.disable2FA': 'Disable 2FA',
    'account.backupCodes': 'Backup Codes',
    'account.viewBackupCodes': 'View Backup Codes',
    'account.profileUpdated': 'Profile updated',
    'account.passwordUpdated': 'Password updated',

    // ===================
    // TEAMS (~20 keys)
    // For team management
    // ===================
    'teams.team': 'Team',
    'teams.teams': 'Teams',
    'teams.members': 'Members',
    'teams.member': 'Member',
    'teams.invite': 'Invite',
    'teams.inviteMember': 'Invite Member',
    'teams.role': 'Role',
    'teams.owner': 'Owner',
    'teams.admin': 'Admin',
    'teams.editor': 'Editor',
    'teams.viewer': 'Viewer',
    'teams.teamName': 'Team Name',
    'teams.teamSettings': 'Team Settings',
    'teams.createTeam': 'Create Team',
    'teams.leaveTeam': 'Leave Team',
    'teams.deleteTeam': 'Delete Team',
    'teams.switchTeam': 'Switch Team',
    'teams.teamMembers': 'Team Members',
    'teams.addMember': 'Add Member',
    'teams.removeMember': 'Remove Member',

    // ===================
    // NAVIGATION (~10 keys)
    // Common nav items
    // ===================
    'navigation.dashboard': 'Dashboard',
    'navigation.home': 'Home',
    'navigation.settings': 'Settings',
    'navigation.profile': 'Profile',
    'navigation.account': 'Account',
    'navigation.help': 'Help',
    'navigation.support': 'Support',
    'navigation.docs': 'Documentation',
    'navigation.backToDashboard': 'Back to Dashboard',
    'navigation.accountSettings': 'Account Settings'
  }

  const translate = (key: string, _options?: any): string => fallbacks[key] || key
  const translateString = (key: string, options?: any): string => translate(key, options)
  const translateContent = (entity: any, field: string): string => entity?.[field] || ''

  return {
    t: translate,
    tString: translateString,
    tContent: translateContent,
    tInfo: (key: string) => ({
      key,
      value: translate(key),
      mode: 'system' as const,
      category: 'ui',
      isMissing: !fallbacks[key],
      hasTeamOverride: false
    }),
    hasTranslation: (key: string) => !!fallbacks[key],
    getAvailableLocales: () => ['en'],
    getTranslationMeta: (key: string) => ({
      key,
      value: translate(key),
      hasTeamOverride: false,
      isSystemMissing: !fallbacks[key],
      availableLocales: ['en']
    }),
    refreshTranslations: async () => {},
    locale: ref('en'),
    isDev: false,
    devModeEnabled: ref(false)
  }
}
