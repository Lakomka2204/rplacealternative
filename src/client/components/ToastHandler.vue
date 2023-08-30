<template>
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
  <div id="toaster" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex">
    <div class="toast-body">
      Hello, world! This is a toast message.
    </div>
    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
  </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const DOMReady = ref(false);
let toast, doc;
onMounted(() => {
    DOMReady.value=true;
    doc = document.getElementById('toaster');
    toast = bootstrap.Toast.getOrCreateInstance(doc);
    doc.addEventListener('hidden.bs.toast',() =>
    {
        doc.classList.forEach(z => {
          if (z.startsWith('text-bg'))
          doc.classList.remove(z);
        })
        doc.removeAttribute('type');
    });
});
const associations = {
    'info':"text-bg-secondary",
    'success':"text-bg-success",
    'warn':"text-bg-warning",
    'error':'text-bg-danger'
}
function show(msg, type) {
    console.log('show received',msg,type);
    if (!DOMReady.value) return;
    if (!['info', 'success', 'warn', 'error'].includes(type))
      type = 'info';
    if (toast.isShown())
    toast.hide();
    doc.setAttribute('type',type);
    doc.classList.add(associations[type]);
    doc.querySelector('.toast-body').textContent = msg;
    toast.show();
}
defineExpose({show});


</script>