const fs = require('fs');

const files = [
  'frontend/src/components/inventory/ProductModal.vue',
  'frontend/src/components/inventory/ProductEditModal.vue'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('useSaleConfigStore')) {
    content = content.replace(/import \{ useI18n \} from 'vue-i18n'/, "import { useI18n } from 'vue-i18n'\nimport { useSaleConfigStore } from '@/stores/saleConfig'");
    content = content.replace(/const \{ t \} = useI18n\(\)/, "const { t } = useI18n()\nconst saleConfigStore = useSaleConfigStore()");
  }

  // Replace labels
  content = content.replace(/:label="\$t\('inventory\.modal\.salePrice'\)"/g, ':label="`${$t(\'inventory.modal.salePrice\')} (${saleConfigStore.moneda})`"');
  content = content.replace(/:label="\$t\('inventory\.modal\.costPrice'\)"/g, ':label="`${$t(\'inventory.modal.costPrice\')} (${saleConfigStore.moneda})`"');
  content = content.replace(/:label="\$t\('inventory\.modal\.boxPrice'\)"/g, ':label="`${$t(\'inventory.modal.boxPrice\')} (${saleConfigStore.moneda})`"');

  // Replace boxPreview cost
  // {{ $t('inventory.modal.boxPreview', { units: resolved.cantidad, cost: resolved.costoUnitario.toFixed(2) }) }}
  content = content.replace(/cost: resolved\.costoUnitario\.toFixed\(2\)/g, "cost: saleConfigStore.money(resolved.costoUnitario)");

  fs.writeFileSync(file, content, 'utf8');
}

// Update translations
let enJson = fs.readFileSync('frontend/src/locales/en.json', 'utf8');
enJson = enJson.replace(/"boxPreview":\s*"([^"]*)\$\{cost\}([^"]*)"/, '"boxPreview": "$1{cost}$2"');
fs.writeFileSync('frontend/src/locales/en.json', enJson, 'utf8');

let esJson = fs.readFileSync('frontend/src/locales/es.json', 'utf8');
esJson = esJson.replace(/"boxPreview":\s*"([^"]*)\$\{cost\}([^"]*)"/, '"boxPreview": "$1{cost}$2"');
fs.writeFileSync('frontend/src/locales/es.json', esJson, 'utf8');
