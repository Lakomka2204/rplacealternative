<template>
    <div class="modal fade" tabindex="-1" v-bind:id="props.id">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{{ props.title }}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :data-bs-target="'#'+props.id"></button>
      </div>
      <div class="modal-body">
        <slot name="modal-body"></slot>
      </div>
      <div class="modal-footer">
        <slot name="modal-footer"></slot>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
const props = defineProps({
  title:String,
  id:String
});
</script>