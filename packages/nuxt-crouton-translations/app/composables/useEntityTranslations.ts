export function useEntityTranslations() {
  const { locale } = useI18n()
  
  function t(entity: any, field: string): string {
    return entity?.translations?.[locale.value]?.[field] || entity?.[field] || ''
  }
  
  return { t }
}