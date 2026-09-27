const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/views/BudgetView.vue',
  'frontend/src/components/budget/ActivityRow.vue',
  'frontend/src/components/budget/BudgetSummaryCard.vue',
  'frontend/src/components/budget/FundingHistoryCard.vue',
  'frontend/src/components/budget/ProductFinancialsTable.vue',
  'frontend/src/components/budget/SpendingBreakdownCard.vue',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Add imports and store initialization
  if (!content.includes('useSaleConfigStore')) {
    content = content.replace(/import \{ useI18n \} from 'vue-i18n'/, "import { useI18n } from 'vue-i18n'\nimport { useSaleConfigStore } from '@/stores/saleConfig'");
    
    // In vue setup, find the place to insert const saleConfigStore = useSaleConfigStore()
    if (content.includes('const { t } = useI18n()')) {
        content = content.replace(/const \{ t \} = useI18n\(\)/, "const { t } = useI18n()\nconst saleConfigStore = useSaleConfigStore()");
    } else if (content.includes('const emit = defineEmits')) {
        content = content.replace(/const emit = defineEmits\(.*?\)/, "$&\nconst saleConfigStore = useSaleConfigStore()");
    } else {
        content = content.replace(/<script setup>/, "<script setup>\nimport { useSaleConfigStore } from '@/stores/saleConfig'\nconst saleConfigStore = useSaleConfigStore()");
    }
  }

  // replace formatMoney definition with money
  content = content.replace(/function formatMoney\s*\([^\)]*\)\s*\{\s*const n = Number\([^)]*\)\s*return n\.toLocaleString\([^)]*\)\s*\}/g, "function money(v) {\n  return saleConfigStore.money(v)\n}");

  // for templates: replace ${{ formatMoney(xxx) }} with {{ money(xxx) }}
  content = content.replace(/\$\{\{\s*formatMoney\((.*?)\)\s*\}\}/g, "{{ money($1) }}");
  
  // same for formatMoney(...) used in strings
  content = content.replace(/formatMoney\(/g, "money(");
  
  // replace literal $ signs in templates that are prepended to the formatMoney (now money) 
  content = content.replace(/\$\-\{\{/g, "-{{");
  content = content.replace(/\$\+\{\{/g, "+{{");

  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed', file);
}
