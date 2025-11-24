<script setup lang="ts">
import { useTranslation } from 'i18next-vue'

import BaseDialog from '@newtab/components/BaseDialog.vue'
import { useDialog } from '@newtab/composables/useDialog'

const { opened, show, hide, toggle } = useDialog()
defineExpose({ show, hide, toggle })

const { t } = useTranslation('newtab')
</script>

<template>
  <base-dialog v-model="opened" :title="t('menu.sponsor')" acrylic opacity>
    <div class="sponsor-content noselect">
      {{ t('sponsor') }}
    </div>
  </base-dialog>
</template>

<style scoped>
.sponsor-content {
  padding: 20px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}
</style>
