<script setup lang="ts">
import type { TranslationsValue, CollabConnection, FieldOptions } from '../composables/useTranslationFields'

// This component handles translations for both:
// 1. Single field: { en: "value", nl: "waarde" }
// 2. Multiple fields: { en: { name: "...", description: "..." }, nl: { ... } }

const props = defineProps<{
  modelValue: TranslationsValue
  fields: string[] // Fields to translate e.g., ['name', 'description']
  label?: string
  error?: string | boolean
  defaultValues?: Record<string, string> // Default values for each field (from main form fields)
  fieldComponents?: Record<string, string> // Custom components per field e.g., { content: 'EditorSimple' }
  showAiTranslate?: boolean // Enable AI translation suggestions
  fieldType?: string // Field type context for AI (e.g., 'product_name', 'description')
  /**
   * Collab connection for real-time block editing.
   * When provided with block editor fields, content syncs via Yjs.
   */
  collab?: CollabConnection
  /**
   * Layout mode: "tabs" (default) or "side-by-side".
   * Side-by-side shows two locale columns for easy comparison.
   */
  layout?: 'tabs' | 'side-by-side'
  /**
   * Primary locale for side-by-side layout (left column, fixed).
   * Default: 'en'
   */
  primaryLocale?: string
  /**
   * Secondary locale for side-by-side layout (right column).
   * If not set, shows a dropdown to select.
   */
  secondaryLocale?: string
  /**
   * Field-specific options like transforms.
   * E.g., { slug: { transform: 'slug' } }
   */
  fieldOptions?: Record<string, FieldOptions>
  /**
   * Group fields into collapsible sections.
   * Maps field name → group label.
   * E.g., { title: 'Info', slug: 'Info', content: 'Content', seoTitle: 'Extra', seoDescription: 'Extra' }
   * Groups containing block editors expand to fill available height.
   */
  fieldGroups?: Record<string, string>
  /**
   * Which groups start open. Defaults to all groups open.
   * Only relevant when fieldGroups is set.
   */
  defaultOpenGroups?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TranslationsValue]
  'update:english': [data: { field: string, value: string }]
}>()

const { locales } = useI18n()
const { t } = useT()

// ─── Locale layout (tabs / side-by-side, primary/secondary locales) ──────────

const {
  layoutMode,
  editingLocale,
  primaryEditingLocale,
  secondaryEditingLocale,
  allLocaleOptions,
  isSameLocale,
  showDualColumns,
  narrowLocaleTab,
  narrowLocaleTabs,
  secondaryEditorRefs,
} = useLocaleLayout(
  locales,
  toRef(props, 'primaryLocale'),
  toRef(props, 'secondaryLocale'),
  toRef(props, 'layout'),
)

// ─── Translation field values (get/set, locale completeness) ─────────────────

const modelValueRef = toRef(props, 'modelValue')
const fieldsRef = toRef(props, 'fields')
const fieldComponentsRef = toRef(props, 'fieldComponents')

const {
  isMultiField,
  fieldComponentMap,
  getFieldComponent,
  isBlockEditorField,
  getFieldValue,
  updateFieldValue,
  isLocaleComplete,
  translationStatus,
} = useTranslationFields(
  modelValueRef,
  fieldsRef,
  fieldComponentsRef,
  locales,
  editingLocale,
  emit,
)

// ─── Field transforms (slug, uppercase, etc.) ────────────────────────────────

const {
  updateFieldWithTransform,
  handleFieldBlur,
} = useFieldTransforms(
  toRef(props, 'fieldOptions'),
  getFieldValue,
  updateFieldValue,
  editingLocale,
)

// ─── Field groups (collapsible sections) ─────────────────────────────────────

const {
  computedFieldGroups,
  openGroupsState,
  groupHasBlockEditor,
} = useFieldGroups(
  fieldsRef,
  toRef(props, 'fieldGroups'),
  toRef(props, 'defaultOpenGroups'),
  isBlockEditorField,
)

// ─── AI translation ───────────────────────────────────────────────────────────

const {
  blockEditorRefreshKey,
  showBlockTranslateConfirm,
  getAllTranslationsForField,
  findBestSourceLocale,
  isFieldTranslating,
  hasSourceContent,
  hasTargetContent,
  getTranslateTooltip,
  getBestSourceText,
  confirmBlockTranslation,
  cancelBlockTranslation,
  proceedWithBlockTranslation,
} = useAiTranslation(
  locales,
  toRef(props, 'collab'),
  toRef(props, 'fieldType'),
  getFieldValue,
  updateFieldValue,
  isBlockEditorField,
)
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- ============================================= -->
    <!-- SIDE-BY-SIDE LAYOUT (with tabs on narrow)    -->
    <!-- ============================================= -->
    <template v-if="layoutMode === 'side-by-side' && isMultiField">
      <!-- NARROW: Tab-based locale switching (< lg screens) -->
      <div class="lg:hidden flex flex-col h-full min-h-0">
        <!-- Locale tabs -->
        <UTabs
          v-model="narrowLocaleTab"
          :items="narrowLocaleTabs"
          :content="false"
          color="neutral"
          variant="link"
          class="mb-3"
        />

        <!-- Fields for active locale -->
        <!-- GROUPED: Collapsible sections when fieldGroups prop is provided -->
        <template v-if="computedFieldGroups">
          <div class="flex-1 flex flex-col min-h-0">
            <template v-for="group in computedFieldGroups" :key="`narrow-group-${group.name}`">
              <div v-if="groupHasBlockEditor(group.fields)" class="flex-1 flex flex-col min-h-[200px] mt-3 first:mt-0">
                <button
                  class="flex items-center justify-between w-full py-1.5 text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground transition-colors shrink-0"
                  @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                >
                  {{ group.name }}
                  <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                </button>
                <div v-if="openGroupsState[group.name]" class="flex-1 flex flex-col gap-1 min-h-0 pt-2">
                  <div v-for="field in group.fields" :key="`narrow-g-${field}`" class="flex-1 flex flex-col gap-1 min-h-0">
                    <div v-if="group.fields.length > 1 || showAiTranslate" class="flex items-center justify-between h-5 shrink-0">
                      <label v-if="group.fields.length > 1" class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                      <AITranslateButton
                        v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, narrowLocaleTab)"
                        :loading="isFieldTranslating(field, narrowLocaleTab)"
                        :tooltip="getTranslateTooltip(field, narrowLocaleTab)"
                        size="2xs"
                        icon-only
                        is-block-editor
                        @click="confirmBlockTranslation(field, narrowLocaleTab)"
                      />
                    </div>
                    <div v-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'" class="flex-1 min-h-0">
                      <CroutonPagesEditorBlockEditorWithPreview
                        :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                        :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                        :collab-provider="collab?.connection"
                        :collab-user="collab?.user"
                        :editable="!isFieldTranslating(field, narrowLocaleTab)"
                        placeholder="Type / to insert a block..."
                        @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
                      />
                    </div>
                    <div v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'" class="flex-1 min-h-0 border rounded-md overflow-hidden border-default">
                      <CroutonPagesEditorBlockEditor
                        :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                        :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                        :collab-provider="collab?.connection"
                        :collab-user="collab?.user"
                        :editable="!isFieldTranslating(field, narrowLocaleTab)"
                        placeholder="Type / to insert a block..."
                        @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="shrink-0 mt-3 first:mt-0">
                <button
                  class="flex items-center justify-between w-full py-1.5 text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground transition-colors"
                  @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                >
                  {{ group.name }}
                  <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                </button>
                <div v-if="openGroupsState[group.name]" class="flex flex-col gap-2 pb-2">
                  <div v-for="field in group.fields" :key="`narrow-g-${field}`" class="flex flex-col gap-1">
                    <div class="flex items-center justify-between h-5">
                      <label class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                      <AITranslateButton
                        v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, narrowLocaleTab)"
                        :source-text="getBestSourceText(field, narrowLocaleTab)"
                        :source-language="findBestSourceLocale(field, narrowLocaleTab)"
                        :target-language="narrowLocaleTab"
                        :field-type="fieldType || field"
                        :existing-translations="getAllTranslationsForField(field)"
                        :target-has-content="hasTargetContent(field, narrowLocaleTab)"
                        :available-translations="getAllTranslationsForField(field)"
                        size="2xs"
                        icon-only
                        @translate="(text) => updateFieldValue(field, text, narrowLocaleTab)"
                      />
                    </div>
                    <div v-if="getFieldComponent(field) === 'CroutonEditorSimple'" class="flex-1 border rounded-md overflow-hidden border-default">
                      <div class="h-full min-h-[200px]">
                        <CroutonEditorSimple :model-value="getFieldValue(field, narrowLocaleTab)" @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)" />
                      </div>
                    </div>
                    <UTextarea
                      v-else-if="getFieldComponent(field) === 'UTextarea'"
                      :model-value="getFieldValue(field, narrowLocaleTab)"
                      :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
                      :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
                      :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
                      class="w-full"
                      size="sm"
                      @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
                    />
                    <UInput
                      v-else
                      :model-value="getFieldValue(field, narrowLocaleTab)"
                      :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
                      :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
                      :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
                      class="w-full"
                      size="sm"
                      @update:model-value="updateFieldWithTransform(field, $event, narrowLocaleTab)"
                      @blur="handleFieldBlur(field, narrowLocaleTab)"
                    />
                  </div>
                  <slot :name="`group-${group.name.toLowerCase()}`" :locale="narrowLocaleTab" />
                </div>
              </div>
            </template>
          </div>
        </template>
        <!-- FLAT: Original ungrouped layout -->
        <div v-else class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <div
            v-for="field in fields"
            :key="`narrow-${field}`"
            :class="[
              'flex flex-col gap-1',
              field === 'content' ? 'flex-1 min-h-[300px]' : ''
            ]"
          >
            <div class="flex items-center justify-between h-5">
              <label class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ field }}
              </label>
              <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
              <AITranslateButton
                v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, narrowLocaleTab)"
                :source-text="getBestSourceText(field, narrowLocaleTab)"
                :source-language="findBestSourceLocale(field, narrowLocaleTab)"
                :target-language="narrowLocaleTab"
                :field-type="fieldType || field"
                :existing-translations="getAllTranslationsForField(field)"
                :target-has-content="hasTargetContent(field, narrowLocaleTab)"
                :available-translations="getAllTranslationsForField(field)"
                size="2xs"
                icon-only
                @translate="(text) => updateFieldValue(field, text, narrowLocaleTab)"
              />
              <!-- Block editor translation (controlled mode) -->
              <AITranslateButton
                v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, narrowLocaleTab)"
                :loading="isFieldTranslating(field, narrowLocaleTab)"
                :tooltip="getTranslateTooltip(field, narrowLocaleTab)"
                size="2xs"
                icon-only
                is-block-editor
                @click="confirmBlockTranslation(field, narrowLocaleTab)"
              />
            </div>

            <!-- CroutonEditorSimple -->
            <div
              v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
              class="flex-1 border rounded-md overflow-hidden border-default"
            >
              <div class="h-full min-h-[200px]">
                <CroutonEditorSimple
                  :model-value="getFieldValue(field, narrowLocaleTab)"
                  @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
                />
              </div>
            </div>

            <!-- CroutonPagesEditorBlockEditor -->
            <div
              v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
              class="flex-1 border rounded-md overflow-hidden border-default"
            >
              <div class="h-full min-h-[350px]">
                <CroutonPagesEditorBlockEditor
                  :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                  :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="!isFieldTranslating(field, narrowLocaleTab)"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
                />
              </div>
            </div>

            <!-- CroutonPagesEditorBlockEditorWithPreview -->
            <div
              v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
              class="flex-1 min-h-[350px] max-h-[600px]"
            >
              <CroutonPagesEditorBlockEditorWithPreview
                :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                :collab-provider="collab?.connection"
                :collab-user="collab?.user"
                :editable="!isFieldTranslating(field, narrowLocaleTab)"
                placeholder="Type / to insert a block..."
                @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
              />
            </div>

            <!-- UTextarea -->
            <UTextarea
              v-else-if="getFieldComponent(field) === 'UTextarea'"
              :model-value="getFieldValue(field, narrowLocaleTab)"
              :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
              :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
              :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
              class="w-full"
              size="sm"
              @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
            />

            <!-- UInput (default) -->
            <UInput
              v-else
              :model-value="getFieldValue(field, narrowLocaleTab)"
              :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
              :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
              :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
              class="w-full"
              size="sm"
              @update:model-value="updateFieldWithTransform(field, $event, narrowLocaleTab)"
              @blur="handleFieldBlur(field, narrowLocaleTab)"
            />
          </div>
        </div>
      </div>

      <!-- WIDE: Side-by-side columns (lg+ screens) -->
      <div class="hidden lg:flex lg:flex-col gap-4 h-full min-h-0">
        <!-- Header row: slot + column toggle -->
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <slot name="header" />
          </div>
          <UButton
            :variant="!showDualColumns ? 'solid' : 'ghost'"
            color="neutral"
            icon="i-lucide-square"
            size="xs"
            @click="showDualColumns = false"
          />
          <UButton
            :variant="showDualColumns ? 'solid' : 'ghost'"
            color="neutral"
            icon="i-lucide-columns-2"
            size="xs"
            @click="showDualColumns = true"
          />
        </div>

        <div :class="['grid gap-6 flex-1 min-h-0', showDualColumns ? 'grid-cols-2' : 'grid-cols-1']">
        <!-- LEFT COLUMN: Primary locale (selectable) -->
        <div class="flex flex-col min-h-0">
          <!-- Column header with locale tabs -->
          <div class="flex items-center justify-between mb-3">
            <UFieldGroup class="w-full">
              <UButton
                v-for="loc in allLocaleOptions"
                :key="loc.value"
                :variant="primaryEditingLocale === loc.value ? 'soft' : 'outline'"
                color="neutral"
                size="sm"
                class="w-full"
                @click="primaryEditingLocale = loc.value"
              >
                <span class="flex items-center gap-2">
                  {{ loc.value.toUpperCase() }}
                  <span
                    v-if="loc.value === 'en'"
                    class="text-red-500"
                  >*</span>
                  <span
                    v-if="isLocaleComplete(loc.value)"
                    class="size-2 rounded-full bg-green-500"
                  />
                </span>
              </UButton>
            </UFieldGroup>
          </div>

          <!-- Primary locale fields -->
          <!-- GROUPED: Collapsible sections when fieldGroups prop is provided -->
          <template v-if="computedFieldGroups">
            <div class="flex-1 flex flex-col min-h-0">
              <template v-for="group in computedFieldGroups" :key="`primary-group-${group.name}`">
                <!-- Block editor group: fills remaining height -->
                <div v-if="groupHasBlockEditor(group.fields)" class="flex-1 flex flex-col min-h-[200px] mt-3 first:mt-0">
                  <button
                    type="button"
                  class="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-muted/70 uppercase tracking-widest hover:text-muted transition-colors shrink-0 border-b border-default/50"
                    @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                  >
                    {{ group.name }}
                    <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                  </button>
                  <div v-if="openGroupsState[group.name]" class="flex-1 flex flex-col gap-1 min-h-0 pt-2">
                    <div v-for="field in group.fields" :key="`primary-g-${field}`" class="flex-1 flex flex-col gap-1 min-h-0">
                      <div v-if="group.fields.length > 1 || showAiTranslate" class="flex items-center justify-between h-5 shrink-0">
                        <label v-if="group.fields.length > 1" class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                        <AITranslateButton
                          v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, primaryEditingLocale)"
                          :loading="isFieldTranslating(field, primaryEditingLocale)"
                          :tooltip="getTranslateTooltip(field, primaryEditingLocale)"
                          size="2xs"
                          icon-only
                          is-block-editor
                          @click="confirmBlockTranslation(field, primaryEditingLocale)"
                        />
                      </div>
                      <div v-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'" class="flex-1 min-h-0">
                        <CroutonPagesEditorBlockEditorWithPreview
                          :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                          :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                          :collab-provider="collab?.connection"
                          :collab-user="collab?.user"
                          :editable="!isFieldTranslating(field, primaryEditingLocale)"
                          placeholder="Type / to insert a block..."
                          @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                        />
                      </div>
                      <div v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'" class="flex-1 min-h-0 border rounded-md overflow-hidden border-default">
                        <CroutonPagesEditorBlockEditor
                          :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                          :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                          :collab-provider="collab?.connection"
                          :collab-user="collab?.user"
                          :editable="!isFieldTranslating(field, primaryEditingLocale)"
                          placeholder="Type / to insert a block..."
                          @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Regular fields group: collapsible, shrink-0 -->
                <div v-else class="shrink-0 mt-3 first:mt-0">
                  <button
                    type="button"
                  class="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-muted/70 uppercase tracking-widest hover:text-muted transition-colors border-b border-default/50"
                    @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                  >
                    {{ group.name }}
                    <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                  </button>
                  <div v-if="openGroupsState[group.name]" class="flex flex-col gap-2 pt-2 pb-1">
                    <div v-for="field in group.fields" :key="`primary-g-${field}`" class="flex flex-col gap-1">
                      <div class="flex items-center justify-between h-5">
                        <label class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                        <AITranslateButton
                          v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, primaryEditingLocale)"
                          :source-text="getBestSourceText(field, primaryEditingLocale)"
                          :source-language="findBestSourceLocale(field, primaryEditingLocale)"
                          :target-language="primaryEditingLocale"
                          :field-type="fieldType || field"
                          :existing-translations="getAllTranslationsForField(field)"
                          :target-has-content="hasTargetContent(field, primaryEditingLocale)"
                          :available-translations="getAllTranslationsForField(field)"
                          size="2xs"
                          icon-only
                          @translate="(text) => updateFieldValue(field, text, primaryEditingLocale)"
                        />
                      </div>
                      <div v-if="getFieldComponent(field) === 'CroutonEditorSimple'" class="flex-1 border rounded-md overflow-hidden border-default">
                        <div class="h-full min-h-[200px]">
                          <CroutonEditorSimple :model-value="getFieldValue(field, primaryEditingLocale)" @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)" />
                        </div>
                      </div>
                      <UTextarea
                        v-else-if="getFieldComponent(field) === 'UTextarea'"
                        :model-value="getFieldValue(field, primaryEditingLocale)"
                        :placeholder="defaultValues?.[field] || ''"
                        :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                        :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                        class="w-full"
                        size="sm"
                        @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
                      />
                      <UInput
                        v-else
                        :model-value="getFieldValue(field, primaryEditingLocale)"
                        :placeholder="defaultValues?.[field] || ''"
                        :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                        :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                        class="w-full"
                        size="sm"
                        @update:model-value="updateFieldWithTransform(field, $event, primaryEditingLocale)"
                        @blur="handleFieldBlur(field, primaryEditingLocale)"
                      />
                    </div>
                    <slot :name="`group-${group.name.toLowerCase()}`" :locale="primaryEditingLocale" />
                  </div>
                </div>
              </template>
            </div>
          </template>
          <!-- FLAT: Original ungrouped layout -->
          <div v-else class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            <div
              v-for="field in fields"
              :key="`primary-${field}`"
              :class="[
                'flex flex-col gap-1',
                field === 'content' ? 'flex-1 min-h-[300px]' : ''
              ]"
            >
              <div class="flex items-center justify-between h-5">
                <label class="text-xs font-medium text-muted uppercase tracking-wide">
                  {{ field }}
                </label>
                <!-- AI Translate button for primary locale -->
                <AITranslateButton
                  v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, primaryEditingLocale)"
                  :source-text="getBestSourceText(field, primaryEditingLocale)"
                  :source-language="findBestSourceLocale(field, primaryEditingLocale)"
                  :target-language="primaryEditingLocale"
                  :field-type="fieldType || field"
                  :existing-translations="getAllTranslationsForField(field)"
                  :target-has-content="hasTargetContent(field, primaryEditingLocale)"
                  :available-translations="getAllTranslationsForField(field)"
                  size="2xs"
                  icon-only
                  @translate="(text) => updateFieldValue(field, text, primaryEditingLocale)"
                />
                <!-- Block editor translation for primary locale -->
                <AITranslateButton
                  v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, primaryEditingLocale)"
                  :loading="isFieldTranslating(field, primaryEditingLocale)"
                  :tooltip="getTranslateTooltip(field, primaryEditingLocale)"
                  size="2xs"
                  icon-only
                  is-block-editor
                  @click="confirmBlockTranslation(field, primaryEditingLocale)"
                />
              </div>

              <!-- CroutonEditorSimple -->
              <div
                v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[200px]">
                  <CroutonEditorSimple
                    :model-value="getFieldValue(field, primaryEditingLocale)"
                    @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditor -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[350px]">
                  <CroutonPagesEditorBlockEditor
                    :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                    :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                    :collab-provider="collab?.connection"
                    :collab-user="collab?.user"
                    :editable="!isFieldTranslating(field, primaryEditingLocale)"
                    placeholder="Type / to insert a block..."
                    @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditorWithPreview -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
                class="flex-1 min-h-[350px] max-h-[600px]"
              >
                <CroutonPagesEditorBlockEditorWithPreview
                  :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                  :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="!isFieldTranslating(field, primaryEditingLocale)"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                />
              </div>

              <!-- UTextarea -->
              <UTextarea
                v-else-if="getFieldComponent(field) === 'UTextarea'"
                :model-value="getFieldValue(field, primaryEditingLocale)"
                :placeholder="defaultValues?.[field] || ''"
                :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
              />

              <!-- UInput (default) -->
              <UInput
                v-else
                :model-value="getFieldValue(field, primaryEditingLocale)"
                :placeholder="defaultValues?.[field] || ''"
                :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldWithTransform(field, $event, primaryEditingLocale)"
                @blur="handleFieldBlur(field, primaryEditingLocale)"
              />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Secondary locale (selectable) -->
        <div v-if="showDualColumns" class="flex flex-col min-h-0">
          <!-- Column header with locale tabs -->
          <div class="flex items-center justify-between mb-3">
            <UFieldGroup class="w-full">
              <UButton
                v-for="loc in allLocaleOptions"
                :key="loc.value"
                :variant="secondaryEditingLocale === loc.value ? 'soft' : 'outline'"
                color="neutral"
                size="sm"
                class="w-full"
                @click="secondaryEditingLocale = loc.value"
              >
                <span class="flex items-center gap-2">
                  {{ loc.value.toUpperCase() }}
                  <span
                    v-if="loc.value === 'en'"
                    class="text-red-500"
                  >*</span>
                  <span
                    v-if="isLocaleComplete(loc.value)"
                    class="size-2 rounded-full bg-green-500"
                  />
                </span>
              </UButton>
            </UFieldGroup>
          </div>

          <!-- Secondary locale fields -->
          <!-- GROUPED: Collapsible sections when fieldGroups prop is provided -->
          <template v-if="computedFieldGroups">
            <div class="flex-1 flex flex-col min-h-0">
              <template v-for="group in computedFieldGroups" :key="`secondary-group-${group.name}`">
                <!-- Block editor group: fills remaining height -->
                <div v-if="groupHasBlockEditor(group.fields)" class="flex-1 flex flex-col min-h-[200px] mt-3 first:mt-0">
                  <button
                    type="button"
                  class="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-muted/70 uppercase tracking-widest hover:text-muted transition-colors shrink-0 border-b border-default/50"
                    @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                  >
                    {{ group.name }}
                    <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                  </button>
                  <div v-if="openGroupsState[group.name]" class="flex-1 flex flex-col gap-1 min-h-0 pt-2">
                    <div v-for="field in group.fields" :key="`secondary-g-${field}`" class="flex-1 flex flex-col gap-1 min-h-0">
                      <div v-if="group.fields.length > 1 || showAiTranslate" class="flex items-center justify-between h-5 shrink-0">
                        <label v-if="group.fields.length > 1" class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                        <AITranslateButton
                          v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, secondaryEditingLocale)"
                          :loading="isFieldTranslating(field, secondaryEditingLocale)"
                          :tooltip="getTranslateTooltip(field, secondaryEditingLocale)"
                          size="2xs"
                          icon-only
                          is-block-editor
                          @click="confirmBlockTranslation(field, secondaryEditingLocale)"
                        />
                      </div>
                      <div v-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'" class="flex-1 min-h-0">
                        <CroutonPagesEditorBlockEditorWithPreview
                          :key="`${field}-${secondaryEditingLocale}-${blockEditorRefreshKey}`"
                          :ref="(el: any) => { if (el) secondaryEditorRefs[field] = el }"
                          :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                          :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                          :collab-provider="collab?.connection"
                          :collab-user="collab?.user"
                          :editable="!isFieldTranslating(field, secondaryEditingLocale)"
                          :default-tab="isSameLocale ? 'preview' : 'editor'"
                          placeholder="Type / to insert a block..."
                          @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                        />
                      </div>
                      <div v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'" class="flex-1 min-h-0 border rounded-md overflow-hidden border-default">
                        <CroutonPagesEditorBlockEditor
                          :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                          :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                          :collab-provider="collab?.connection"
                          :collab-user="collab?.user"
                          :editable="!isFieldTranslating(field, secondaryEditingLocale)"
                          placeholder="Type / to insert a block..."
                          @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Regular fields group: collapsible, shrink-0 -->
                <div v-else class="shrink-0 mt-3 first:mt-0">
                  <button
                    type="button"
                  class="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-muted/70 uppercase tracking-widest hover:text-muted transition-colors border-b border-default/50"
                    @click="openGroupsState[group.name] = !openGroupsState[group.name]"
                  >
                    {{ group.name }}
                    <UIcon :name="openGroupsState[group.name] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
                  </button>
                  <div v-if="openGroupsState[group.name]" class="flex flex-col gap-2 pt-2 pb-1">
                    <div v-for="field in group.fields" :key="`secondary-g-${field}`" class="flex flex-col gap-1">
                      <div class="flex items-center justify-between h-5">
                        <label class="text-xs font-medium text-muted uppercase tracking-wide">{{ field }}</label>
                        <AITranslateButton
                          v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, secondaryEditingLocale)"
                          :source-text="getBestSourceText(field, secondaryEditingLocale)"
                          :source-language="findBestSourceLocale(field, secondaryEditingLocale)"
                          :target-language="secondaryEditingLocale"
                          :field-type="fieldType || field"
                          :existing-translations="getAllTranslationsForField(field)"
                          :target-has-content="hasTargetContent(field, secondaryEditingLocale)"
                          :available-translations="getAllTranslationsForField(field)"
                          size="2xs"
                          icon-only
                          @translate="(text) => updateFieldValue(field, text, secondaryEditingLocale)"
                        />
                      </div>
                      <div v-if="getFieldComponent(field) === 'CroutonEditorSimple'" class="flex-1 border rounded-md overflow-hidden border-default">
                        <div class="h-full min-h-[200px]">
                          <CroutonEditorSimple :model-value="getFieldValue(field, secondaryEditingLocale)" @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)" />
                        </div>
                      </div>
                      <UTextarea
                        v-else-if="getFieldComponent(field) === 'UTextarea'"
                        :model-value="getFieldValue(field, secondaryEditingLocale)"
                        :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                        class="w-full"
                        size="sm"
                        @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
                      />
                      <UInput
                        v-else
                        :model-value="getFieldValue(field, secondaryEditingLocale)"
                        :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                        class="w-full"
                        size="sm"
                        @update:model-value="updateFieldWithTransform(field, $event, secondaryEditingLocale)"
                        @blur="handleFieldBlur(field, secondaryEditingLocale)"
                      />
                    </div>
                    <slot :name="`group-${group.name.toLowerCase()}-secondary`" :locale="secondaryEditingLocale" />
                  </div>
                </div>
              </template>
            </div>
          </template>
          <!-- FLAT: Original ungrouped layout -->
          <div v-else class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            <div
              v-for="field in fields"
              :key="`secondary-${field}`"
              :class="[
                'flex flex-col gap-1',
                field === 'content' ? 'flex-1 min-h-[300px]' : ''
              ]"
            >
              <div class="flex items-center justify-between h-5">
                <label class="text-xs font-medium text-muted uppercase tracking-wide">
                  {{ field }}
                </label>
                <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
                <AITranslateButton
                  v-if="showAiTranslate && !isBlockEditorField(field) && hasSourceContent(field, secondaryEditingLocale)"
                  :source-text="getBestSourceText(field, secondaryEditingLocale)"
                  :source-language="findBestSourceLocale(field, secondaryEditingLocale)"
                  :target-language="secondaryEditingLocale"
                  :field-type="fieldType || field"
                  :existing-translations="getAllTranslationsForField(field)"
                  :target-has-content="hasTargetContent(field, secondaryEditingLocale)"
                  :available-translations="getAllTranslationsForField(field)"
                  size="2xs"
                  icon-only
                  @translate="(text) => updateFieldValue(field, text, secondaryEditingLocale)"
                />
                <!-- Block editor translation (controlled mode) -->
                <AITranslateButton
                  v-if="showAiTranslate && isBlockEditorField(field) && hasSourceContent(field, secondaryEditingLocale)"
                  :loading="isFieldTranslating(field, secondaryEditingLocale)"
                  :tooltip="getTranslateTooltip(field, secondaryEditingLocale)"
                  size="2xs"
                  icon-only
                  is-block-editor
                  @click="confirmBlockTranslation(field, secondaryEditingLocale)"
                />
              </div>

              <!-- CroutonEditorSimple -->
              <div
                v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[200px]">
                  <CroutonEditorSimple
                    :model-value="getFieldValue(field, secondaryEditingLocale)"
                    @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditor -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[350px]">
                  <CroutonPagesEditorBlockEditor
                    :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                    :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                    :collab-provider="collab?.connection"
                    :collab-user="collab?.user"
                    :editable="!isFieldTranslating(field, secondaryEditingLocale)"
                    placeholder="Type / to insert a block..."
                    @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditorWithPreview -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
                class="flex-1 min-h-[350px] max-h-[600px]"
              >
                <CroutonPagesEditorBlockEditorWithPreview
                  :key="`${field}-${secondaryEditingLocale}-${blockEditorRefreshKey}`"
                  :ref="(el: any) => { if (el) secondaryEditorRefs[field] = el }"
                  :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                  :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="!isFieldTranslating(field, secondaryEditingLocale)"
                  :default-tab="isSameLocale ? 'preview' : 'editor'"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                />
              </div>

              <!-- UTextarea -->
              <UTextarea
                v-else-if="getFieldComponent(field) === 'UTextarea'"
                :model-value="getFieldValue(field, secondaryEditingLocale)"
                :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
              />

              <!-- UInput (default) -->
              <UInput
                v-else
                :model-value="getFieldValue(field, secondaryEditingLocale)"
                :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldWithTransform(field, $event, secondaryEditingLocale)"
                @blur="handleFieldBlur(field, secondaryEditingLocale)"
              />

            </div>
          </div>
        </div>
        </div>
      </div>
    </template>

    <!-- ============================================= -->
    <!-- TABS LAYOUT (default, for narrow containers) -->
    <!-- ============================================= -->
    <template v-else>
      <!-- Language selector with status indicators -->
      <div class="flex items-center justify-between">
        <UFieldGroup class="w-full">
          <UButton
            v-for="loc in locales"
            :key="typeof loc === 'string' ? loc : loc.code"
            :variant="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'soft' : 'outline'"
            color="neutral"
            size="sm"
            class="w-full"
            @click="editingLocale = typeof loc === 'string' ? loc : loc.code"
          >
            <span class="flex items-center gap-2">
              {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
              <span
                v-if="(typeof loc === 'string' ? loc : loc.code) === 'en'"
                class="text-red-500"
              >*</span>
              <span
                v-if="translationStatus.find(s => s.locale === (typeof loc === 'string' ? loc : loc.code))?.complete"
                class="size-2 rounded-full bg-green-500"
              />
            </span>
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Multi-field mode: show inputs for each field -->
      <div
        v-if="isMultiField"
        class="space-y-4"
      >
        <UFormField
          v-for="field in fields"
          :key="field"
          :label="`${field.charAt(0).toUpperCase() + field.slice(1)} (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
          :name="`translations.${editingLocale}.${field}`"
          :required="editingLocale === 'en'"
        >
          <!-- CroutonEditorSimple (rich text editor) - needs height container -->
          <div
            v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
            class="border rounded-lg overflow-hidden border-gray-300 dark:border-gray-700"
          >
            <div class="h-64">
              <CroutonEditorSimple
                :model-value="getFieldValue(field, editingLocale)"
                @update:model-value="updateFieldValue(field, $event)"
              />
            </div>
          </div>

          <!-- CroutonPagesEditorBlockEditor (block-based page editor) -->
          <div
            v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
            class="border rounded-lg overflow-hidden border-gray-300 dark:border-gray-700"
          >
            <div class="min-h-[400px]">
              <CroutonPagesEditorBlockEditor
                :model-value="collab ? undefined : getFieldValue(field, editingLocale)"
                :yxml-fragment="collab?.getXmlFragment(editingLocale)"
                :collab-provider="collab?.connection"
                :collab-user="collab?.user"
                :editable="!isFieldTranslating(field, editingLocale)"
                placeholder="Type / to insert a block..."
                @update:model-value="!collab && updateFieldValue(field, $event)"
              />
            </div>
          </div>

          <!-- CroutonPagesEditorBlockEditorWithPreview (block editor with preview toggle) -->
          <div
            v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
            class="h-[500px] min-h-[350px] max-h-[600px]"
          >
            <CroutonPagesEditorBlockEditorWithPreview
              :model-value="collab ? undefined : getFieldValue(field, editingLocale)"
              :yxml-fragment="collab?.getXmlFragment(editingLocale)"
              :collab-provider="collab?.connection"
              :collab-user="collab?.user"
              :editable="!isFieldTranslating(field, editingLocale)"
              placeholder="Type / to insert a block..."
              @update:model-value="!collab && updateFieldValue(field, $event)"
            />
          </div>

          <!-- UTextarea (for text type fields without custom component) -->
          <UTextarea
            v-else-if="getFieldComponent(field) === 'UTextarea'"
            :model-value="getFieldValue(field, editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue(field, 'en') ? `Fallback: ${getFieldValue(field, 'en')}` : (defaultValues?.[field] || '')"
            :color="error && editingLocale === 'en' && !getFieldValue(field, editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue(field, editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldValue(field, $event)"
          />

          <!-- UInput (default) -->
          <UInput
            v-else
            :model-value="getFieldValue(field, editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue(field, 'en') ? `Fallback: ${getFieldValue(field, 'en')}` : (defaultValues?.[field] || '')"
            :color="error && editingLocale === 'en' && !getFieldValue(field, editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue(field, editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldWithTransform(field, $event)"
            @blur="handleFieldBlur(field)"
          />

          <!-- Show source reference when other locales have content -->
          <div
            v-if="hasSourceContent(field, editingLocale)"
            class="flex items-center gap-2 mt-1"
          >
            <!-- For block editors, don't show raw JSON -->
            <template v-if="isBlockEditorField(field)">
              <p class="text-xs text-gray-500">
                <UIcon name="i-lucide-file-text" class="inline w-3 h-3 mr-1" />
                {{ findBestSourceLocale(field, editingLocale)?.toUpperCase() }} version available
              </p>
            </template>
            <!-- For text fields, show the actual text -->
            <template v-else>
              <p class="text-xs text-gray-500">
                {{ findBestSourceLocale(field, editingLocale)?.toUpperCase() }}: {{ getFieldValue(field, findBestSourceLocale(field, editingLocale) || 'en') }}
              </p>
            </template>
            <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
            <AITranslateButton
              v-if="showAiTranslate && !isBlockEditorField(field)"
              :source-text="getBestSourceText(field, editingLocale)"
              :source-language="findBestSourceLocale(field, editingLocale)"
              :target-language="editingLocale"
              :field-type="fieldType || field"
              :existing-translations="getAllTranslationsForField(field)"
              :target-has-content="hasTargetContent(field, editingLocale)"
              :available-translations="getAllTranslationsForField(field)"
              @translate="(text) => updateFieldValue(field, text, editingLocale)"
            />
            <!-- Block editor translation (controlled mode) -->
            <AITranslateButton
              v-if="showAiTranslate && isBlockEditorField(field)"
              :loading="isFieldTranslating(field, editingLocale)"
              :disabled="!hasSourceContent(field, editingLocale)"
              :tooltip="getTranslateTooltip(field, editingLocale)"
              is-block-editor
              @click="confirmBlockTranslation(field, editingLocale)"
            />
          </div>
        </UFormField>
      </div>

      <!-- Single field mode (backwards compat) -->
      <div
        v-else
        class="space-y-3"
      >
        <UFormField
          :label="`Translation (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
          :name="`values.${editingLocale}`"
          :required="editingLocale === 'en'"
        >
          <UInput
            :model-value="getFieldValue('', editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue('', 'en') ? `Fallback: ${getFieldValue('', 'en')}` : ''"
            :color="error && editingLocale === 'en' && !getFieldValue('', editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue('', editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldWithTransform('', $event)"
            @blur="handleFieldBlur('')"
          />
        </UFormField>

        <!-- Show source reference when other locales have content -->
        <div
          v-if="hasSourceContent('', editingLocale)"
          class="flex items-center gap-2 mt-1"
        >
          <p class="text-xs text-gray-500">
            {{ findBestSourceLocale('', editingLocale)?.toUpperCase() }}: {{ getFieldValue('', findBestSourceLocale('', editingLocale) || 'en') }}
          </p>
          <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
          <AITranslateButton
            v-if="showAiTranslate"
            :source-text="getBestSourceText('', editingLocale)"
            :source-language="findBestSourceLocale('', editingLocale)"
            :target-language="editingLocale"
            :field-type="fieldType"
            :existing-translations="getAllTranslationsForField('')"
            :target-has-content="hasTargetContent('', editingLocale)"
            :available-translations="getAllTranslationsForField('')"
            @translate="(text) => updateFieldValue('', text, editingLocale)"
          />
        </div>
      </div>
    </template>

    <!-- Block editor translation confirmation modal -->
    <UModal v-model:open="showBlockTranslateConfirm">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-alert-triangle" class="size-5 text-primary" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold">{{ t('admin.translations.replaceConfirmTitle') }}</h3>
              <p class="text-sm text-muted mt-1">
                The target field already has content. Translating will replace it with a new AI-generated translation.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="neutral"
              variant="ghost"
              @click="cancelBlockTranslation"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="primary"
              @click="proceedWithBlockTranslation"
            >
              {{ t('admin.translations.replace') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
