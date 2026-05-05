<template>
  <div class="product-card">
    <div class="card-img">
      <div class="img-placeholder">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <rect x="10" y="8" width="28" height="34" rx="2" stroke="#faf8f5" stroke-width="1.5"/>
          <path d="M10 18h28M18 8v10" stroke="#faf8f5" stroke-width="1.5"/>
        </svg>
        <span>image</span>
      </div>
      <Pill
        :label="stockLabel"
        :btnColor="pillColor"
        :circleColor="pillColorText"
        :textColor="pillColorText"
      />
    </div>

    <div class="card-body">
      <span v-if="showProjectTag && product.proyecto_nombre" class="card-project-tag">
        {{ product.proyecto_nombre }}
      </span>
      <span v-if="product.categoria" class="card-code">{{ product.categoria }}</span>
      <span class="card-name">{{ product.nombre }}</span>
      
      <div class="card-meta">
        <div>
          <div class="card-price-label">Price</div>
          <div class="card-price">${{ Number(product.precio_venta).toFixed(2) }}</div>
        </div>
        <div class="card-stock">
          <div class="card-stock-num" :class="stockNumClass">
            {{ product.stock_actual }}
          </div>
          <div class="card-stock-label">total stock</div>
        </div>
      </div>

      <!-- Project usage (conditional) -->
      <div v-if="showUsage" class="card-proj-usage">
        <div class="proj-usage-row">
          <span class="pu-label">Entries</span>
          <span class="pu-val green">+{{ product.entradas_proyecto ?? 0 }}</span>
        </div>
        <div class="proj-usage-row">
          <span class="pu-label">Exits</span>
          <span class="pu-val red">-{{ product.salidas_proyecto ?? 0 }}</span>
        </div>
        <div class="proj-usage-row">
          <span class="pu-label">Net</span>
          <span class="pu-val" :class="netClass">
            {{ netDisplay }}
          </span>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <Anchor
        label="View details"
        :link="detailLink"
        textColor="#c9a962"
        backColor="transparent"
        hoverColor="rgba(201,169,98,0.05)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Pill from '../UI/Pill/Pill.vue'
import Anchor from '../UI/Button/Anchor.vue'

const props = defineProps({
  product: { type: Object, required: true },
  showProjectTag: { type: Boolean, default: true },
  showUsage: { type: Boolean, default: false }
})

const stockLabel = computed(() => {
  if (props.product.stock_actual === 0) return 'Out of stock'
  if (props.product.stock_actual <= props.product.stock_minimo) return 'Low stock'
  return 'In stock'
})

const pillColor = computed(() => {
  if (props.product.stock_actual === 0) return 'rgba(251,113,133,0.12)'
  if (props.product.stock_actual <= props.product.stock_minimo) return 'rgba(201,169,98,0.12)'
  return 'rgba(52,211,153,0.12)'
})

const pillColorText = computed(() => {
  if (props.product.stock_actual === 0) return '#fb7185'
  if (props.product.stock_actual <= props.product.stock_minimo) return '#c9a962'
  return '#34d399'
})

const stockNumClass = computed(() => {
  if (props.product.stock_actual === 0) return 'red'
  if (props.product.stock_actual <= props.product.stock_minimo) return 'gold'
  return ''
})

const netClass = computed(() => {
  const net = props.product.neto_proyecto ?? 0
  return net >= 0 ? 'green' : 'red'
})

const netDisplay = computed(() => {
  const net = props.product.neto_proyecto ?? 0
  return `${net >= 0 ? '+' : ''}${net}`
})

const detailLink = computed(() => `/inventory/${props.product.id_producto}`)
</script>

<style scoped>
.product-card {
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}
.product-card:hover {
  border-color: #333;
}

.card-img {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.img-placeholder {
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed #2a2a2a;
  border-radius: 4px;
}
.img-placeholder span {
  font-size: 10px;
  color: #666;
  letter-spacing: 0.05em;
}

.card-body {
  padding: 0 16px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-project-tag {
  font-size: 11px;
  color: #60a5fa;
  background: rgba(96,165,250,0.08);
  padding: 2px 6px;
  border-radius: 3px;
  align-self: flex-start;
}
.card-code {
  font-size: 11px;
  color: #888;
  font-weight: 500;
  letter-spacing: 0.08em;
}
.card-name {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  color: #faf8f5;
  line-height: 1.2;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #1a1a1a;
}
.card-price-label {
  font-size: 10px;
  color: #666;
}
.card-price {
  font-size: 14px;
  font-weight: 600;
  color: #faf8f5;
  margin-top: 2px;
}
.card-stock {
  text-align: right;
}
.card-stock-num {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.card-stock-num.red { color: #fb7185; }
.card-stock-num.gold { color: #c9a962; }
.card-stock-label {
  font-size: 10px;
  color: #666;
}

.card-proj-usage {
  padding-top: 12px;
  border-top: 1px solid #1a1a1a;
  font-size: 11px;
}
.proj-usage-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.pu-label {
  color: #888;
  font-weight: 500;
}
.pu-val {
  font-weight: 600;
}
.pu-val.green { color: #34d399; }
.pu-val.red { color: #fb7185; }

.card-footer {
  border-top: 1px solid #1a1a1a;
  padding: 12px 16px;
}
</style>

