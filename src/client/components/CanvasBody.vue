<template>
  <canvas id="pixelCanvas" @mousedown.left="onPointerDown" @touchstart="(e) => handleTouch(e, onPointerDown)"
    @mouseup.left="onPointerUp" @touchend="(e) => handleTouch(e, onPointerUp)" @mousemove="onPointerMove"
    @touchmove="(e) => handleTouch(e, onPointerMove)" @wheel.prevent="(e) => adjustZoom(e.deltaY, SCROLL_SENSITIVITY)"
    @auxclick.middle="resetZoom" @contextmenu.prevent="showContext" @click="hideContext">
  </canvas>
  <div class="ctx-menu">
    <ul v-if="unauthorized" class="list-group" ctx-menu-list>
      <li class="list-group-item ctx-menu-element">
        Please login to view details
      </li>
    </ul>
    <ul v-else class="list-group ctx-menu-list">
      <li class="list-group-item ctx-menu-element">
        <span class="user-select-none">Pixel placed by </span>
        <strong class="user-select-all">{{ selectedPixel.placedBy.username }}</strong>
      </li>
      <li class="list-group-item ctx-menu-element">
        <span class="user-select-none">Color </span>
        <strong class="user-select-all">{{ selectedPixel.color }}</strong>
      </li>
      <li class="list-group-item ctx-menu-element">
        <span class="user-select-none">Position</span>
        <ul class=" ctx-menu-list">
          <li class=" ctx-menu-element">
            <span class="user-select-none">X </span>
            <strong class="user-select-all">{{ selectedPixel.position.x }}</strong>
          </li>
          <li class=" ctx-menu-element">
            <span class="user-select-none">Y </span>
            <strong class="user-select-all">{{ selectedPixel.position.y }}</strong>
          </li>
        </ul>
      </li>
      <li v-if="selectedPixel.hasPixel" class="list-group-item ctx-menu-element">
        <div class="dropdown">
          <button class="btn dropdown-item dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click="modals.user.object.show()">User info</a></li>
            <!-- v-if -->
            <li v-if="isAdmin">
              <hr class="dropdown-divider">
            </li>
            <li v-if="isAdmin"><a class="dropdown-item" href="#"
                @click="patchAxios('/admin/resetcooldown', { id: selectedPixel.placedBy.id }, true)">Reset user's
                cooldown</a>
            </li>
            <li v-if="isAdmin">
              <a v-if="selectedPixel.placedBy.isBanned" class="dropdown-item text-danger" href="#"
                @click="modals.unban.object.show()">Unban user</a>
              <a v-else class="dropdown-item text-danger" href="#" @click="modals.ban.object.show()">Ban user</a>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
  <Modal title="User info" :id="modals.user.id">
    <template #modal-body>
      <div v-for="userProp in Object.keys(selectedPixel.placedBy).filter(x => x != 'isBanned')" class="row gap-3">
        <label class="col-sm-2 col-form-label text-secondary w-25" :for="'userInfo-' + userProp">
          <small>{{ userInfoLabels[userProp] }}</small>
        </label>
        <input :id="'userInfo-' + userProp" readonly class="form-control-plaintext w-auto flex-grow-1"
          :value="selectedPixel.placedBy[userProp]" />
      </div>
    </template>
    <template #modal-footer>
      <button class="btn btn-secondary" data-bs-dismiss="modal" :data-bs-target="modals.user.id">Close</button>
    </template>
  </Modal>
  <form class="needs-validation" novalidate @submit.prevent="banUser">
    <Modal title="Ban user" :id="modals.ban.id">
      <template #modal-body>
        <input type="hidden" name="id" :value="selectedPixel.placedBy.id">
        <div class="row gap-3 mb-3">
          <!-- id,reason,time -->
          <label class="col-sm-2 col-form-label text-secondary w-25" for="banReason">
            <small>Reason</small>
          </label>
          <div class="input-group w-auto flex-grow-1 has-validation">
            <input type="text" placeholder="Minimum 10 characters" id="banReason" class="form-control" name="reason"
              :readonly="modalBusy" required minlength="10">
          </div>
        </div>
        <div class="row gap-3 mb-3">
          <!-- id,reason,time -->
          <label class="col-sm-2 col-form-label text-secondary w-25" for="banTime">
            <small>Duration</small>
          </label>
          <div class="input-group w-auto flex-grow-1 has-validation">
            <input type="number" placeholder="Between 1 and 9999" min="1" max="9999" id="banTime" class="form-control"
              :readonly="modalBusy" name="time" required>
            <span class="input-group-text">seconds</span>
          </div>
        </div>
      </template>
      <template #modal-footer>
        <div class="text-danger">{{ banError }}</div>
        <button :disabled="modalBusy" class="btn btn-secondary" data-bs-dismiss="modal"
          :data-bs-target="modals.user.id">Cancel</button>
        <button :disabled="modalBusy" class="btn btn-danger" type="submit">Ban</button>
      </template>
    </Modal>
  </form>
  <Modal title="Unban user" :id="modals.unban.id">
    <template #modal-body class="user-select-none">
      Unban <strong class="user-select-all">{{ selectedPixel.placedBy.username }}</strong> ?
    </template>
    <template #modal-footer>
      <button class="btn btn-secondary" data-bs-dismiss="modal" :data-bs-target="modals.user.id">Cancel</button>
      <button class="btn btn-danger" @click="unbanUser">Unban</button>
    </template>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue';
import axios, { formToJSON } from 'axios';
import { ref, onMounted, watch, computed, reactive, toRef } from 'vue';

const props = defineProps({
  pixels: Array,
  cvsx: Number,
  cvsy: Number,
});
defineExpose({ checkauth });
const userInfoLabels = {
  id: "ID",
  username: "Username",
  role: "Type",
  createdAt: "Registration date",
}
const pixels = toRef(() => props.pixels);
const cellSize = 30;
const borderWidth = 1;
const isAdmin = ref(false);
const banError = ref('');
const modalBusy = ref(false);
const unauthorized = ref(true);
let userCache = [];
// canvas zoom & drag by https://codepen.io/chengarda
var canvas;
var ctx;
let cameraOffset = { x: -window.innerWidth / 2, y: -window.innerHeight / 2 }
const initialZoom = 0.4;
let cameraZoom = initialZoom;
let MAX_ZOOM = 8
let MIN_ZOOM = 0.1
let SCROLL_SENSITIVITY = 0.01
let isDragging = false
let dragStart = { x: 0, y: 0 }
let initialPinchDistance = null
let lastZoom = cameraZoom;
let ctxMenu;
const modals = {
  user: {
    id: "userInfo",
    object: null,
  },
  ban: {
    id: "banUser",
    object: null,
  },
  unban: {
    id: "unbanUser",
    object: null,
  }
};
const initPixelState = {
  color: null,
  placedBy: {
    id: '0',
    username: 'None',
    role: 'none',
    createdAt: new Date(0),
    isBanned: false
  },
  position: {
    x: -1,
    y: -1
  },
  hasPixel: false
};
const selectedPixel = reactive({ ...initPixelState });
const currentCords = reactive({
  x: -1, y: -1
});
const emit = defineEmits(['changeCurrent', 'toast']);
let darkColor, lightColor, redColor;
const imgCenter = computed(() => {
  return {
    x: -size.value.width / 2,
    y: -size.value.height / 2,
  }
});
const size = computed(() => {
  return {
    width: (props.cvsx * cellSize),
    height: (props.cvsy * cellSize)
  }
});
async function patchAxios(endpoint, body, showSuccessToast) {
  try {
    const res = await axios.patch(endpoint, body);
    if (showSuccessToast)
      emit('toast', { message: res?.data?.message || res.statusText, type: "success" });
    return res;
  }
  catch (err) {
    emit('toast', { message: err?.response?.data?.error || err?.message || "Something unimaginable happened o_O", type: 'error' });
  }

}
async function banUser(ev) {
  try {
    banError.value = '';
    if (!ev.target.checkValidity())
      return banError.value = "Please fil out all fields.";

    modalBusy.value = true;
    const formdata = new FormData(ev.target);
    await axios.patch('/admin/ban', formdata, { headers: { 'Content-Type': 'application/json' } });
    modals.ban.object.hide();

    const bannedUser = userCache.find(x => x.id == formdata.get('id'));
    const index = userCache.indexOf(bannedUser);
    userCache = userCache.splice(index, 1);
    selectedPixel.placedBy.isBanned = true;
    emit('toast', { message: "Successfully banned user " + bannedUser.username, type: "success" })
  }
  catch (err) {
    banError.value = err?.response?.data?.error || err?.message
  }
  finally {
    modalBusy.value = false;
  }
}
async function unbanUser() {
  await patchAxios('/admin/unban', { id: selectedPixel.placedBy.id }, true)
  const unbannedUser = userCache.find(x => x.id == selectedPixel.placedBy.id);
  const index = userCache.indexOf(unbannedUser);
  userCache = userCache.splice(index, 1);
  selectedPixel.placedBy.isBanned = false;
  modals.unban.object.hide();
}
function resetZoom() {
  cameraZoom = initialZoom;
  cameraOffset = structuredClone(imgCenter.value);
  adjustZoom(0, 0);
}
async function checkauth() {
  try {
    const res = await axios.get('/users/my/privileges');
    isAdmin.value = res.data === 'admin';
    unauthorized.value = false;
  }
  catch
  {
    unauthorized.value = true;
  }
  finally {
    return unauthorized.value;
  }
}
async function showContext(event) {
  await SC();
  const x = event.clientX;
  const y = event.clientY;
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = `${x}px`;
  ctxMenu.style.top = `${y}px`;
}
async function SC() {

  if (unauthorized.value)
    if (await checkauth())
      return;
  const cPixel = pixels.value.filter(z => z.position.x == currentCords.x && z.position.y == currentCords.y).pop()
  if (!cPixel) return Object.assign(selectedPixel, initPixelState);
  try {
    let cached;
    if (cached = userCache.find(x => x.id == cPixel.placedBy)) {
      selectedPixel.placedBy = cached;
    }
    else {
      const res = await axios.get('/users/user', { params: { id: cPixel.placedBy } });
      selectedPixel.placedBy = res.data;
      userCache.push(res.data);
    }
    selectedPixel.position.y = cPixel.position.y;
    selectedPixel.position.x = cPixel.position.x;
    selectedPixel.color = cPixel.color;
    selectedPixel.hasPixel = true;
  }
  catch (err) {
    emit('toast', { message: "Failed to get requested user", type: "error" });
    Object.assign(selectedPixel, initPixelState);
  }
}
function hideContext(event) {
  ctxMenu.style.display = 'none';
}
function drawRect(x, y, width, height) {
  ctx.fillRect(x, y, width, height)
}
function drawText(text, x, y, size, font) {
  ctx.font = `${size}px ${font}`
  ctx.fillText(text, x, y)
}
function handlePinch(e) {
  e.preventDefault()

  let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
  let currentDistance = (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2
  if (initialPinchDistance == null) {
    initialPinchDistance = currentDistance
  }
  else {
    adjustZoom(null, currentDistance / initialPinchDistance)
  }
}
function adjustZoom(zoomAmount, zoomFactor) {
  zoomAmount = -Math.sign(zoomAmount) / 10;
  if (!isDragging) {
    if (zoomAmount) {
      cameraZoom += zoomAmount
    }
    else if (zoomFactor) {
      console.log(zoomFactor)
      cameraZoom = zoomFactor * lastZoom
    }

    cameraZoom = Math.min(cameraZoom, MAX_ZOOM)
    cameraZoom = Math.max(cameraZoom, MIN_ZOOM)
    // console.log('zaza', zoomAmount, 'scroll', SCROLL_SENSITIVITY, 'cz', cameraZoom, 'ds', dragStart, 'co', cameraOffset);
  }
}
function onPointerDown(e) {
  try {
    isDragging = true
    dragStart.x = getEventLocation(e).x / cameraZoom - cameraOffset.x
    dragStart.y = getEventLocation(e).y / cameraZoom - cameraOffset.y

  }
  catch { }
}
async function onPointerUp(e) {
  isDragging = false
  initialPinchDistance = null
  lastZoom = cameraZoom;
}
function onPointerMove(e) {
  if (isDragging) {
    try {
      cameraOffset.x = getEventLocation(e).x / cameraZoom - dragStart.x
      cameraOffset.y = getEventLocation(e).y / cameraZoom - dragStart.y
    }
    catch { }
  }
}
function handleTouch(e, singleTouchHandler) {
  if (e.touches.length == 1) {
    singleTouchHandler(e)
  }
  else if (e.type == "touchmove" && e.touches.length == 2) {
    isDragging = false
    handlePinch(e)
  }
}
function draw() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.translate(window.innerWidth / 2, window.innerHeight / 2)
  ctx.scale(cameraZoom, cameraZoom)
  ctx.translate(-window.innerWidth / 2 + cameraOffset.x, -window.innerHeight / 2 + cameraOffset.y)
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.fillStyle = darkColor;
  drawRect(0, 0, size.value.width + borderWidth * 2, size.value.height + borderWidth * 2);
  ctx.fillStyle = lightColor;
  drawRect(borderWidth, borderWidth, size.value.width, size.value.height);
  const center = { x: window.innerWidth / 2 - cameraOffset.x, y: window.innerHeight / 2 - cameraOffset.y };
  let fixedCords = { x: (center.x) / cellSize, y: (center.y) / cellSize };
  fixedCords.x = Math.round(fixedCords.x) * cellSize;
  fixedCords.y = Math.round(fixedCords.y) * cellSize;
  // center of screen window.innerWidth/2 - cameraOffset.x,window.innerHeight/2- cameraOffset.y
  const divider = 5;
  const czd = cellSize / divider;
  currentCords.x = Math.round(fixedCords.x / cellSize);
  currentCords.y = Math.round(fixedCords.y / cellSize);
  emit('changeCurrent', currentCords);
  for (let pixel of pixels.value) {
    ctx.fillStyle = pixel.color;
    drawRect(pixel.position.x * cellSize + borderWidth, pixel.position.y * cellSize + borderWidth, cellSize, cellSize);
  }
  ctx.strokeStyle = redColor
  fixedCords.x += 1.5;
  fixedCords.y += 1.5;
  ctx.beginPath();
  ctx.moveTo(fixedCords.x + czd, fixedCords.y);
  ctx.lineTo(fixedCords.x, fixedCords.y);
  ctx.lineTo(fixedCords.x, fixedCords.y + czd);
  ctx.stroke();
  // ctx.strokeStyle = 'blue'
  ctx.beginPath();
  fixedCords.x--;
  ctx.moveTo(fixedCords.x + cellSize - czd, fixedCords.y);
  ctx.lineTo(fixedCords.x + cellSize, fixedCords.y);
  ctx.lineTo(fixedCords.x + cellSize, fixedCords.y + czd);
  ctx.stroke();
  // ctx.strokeStyle = 'green'
  fixedCords.x++;
  fixedCords.y--;
  ctx.beginPath();
  ctx.moveTo(fixedCords.x, fixedCords.y + cellSize - czd);
  ctx.lineTo(fixedCords.x, fixedCords.y + cellSize);
  ctx.lineTo(fixedCords.x + czd, fixedCords.y + cellSize);
  ctx.stroke();
  // ctx.strokeStyle = 'yellow'
  fixedCords.x--;
  ctx.beginPath();
  ctx.moveTo(fixedCords.x + cellSize - czd, fixedCords.y + cellSize);
  ctx.lineTo(fixedCords.x + cellSize, fixedCords.y + cellSize);
  ctx.lineTo(fixedCords.x + cellSize, fixedCords.y + cellSize - czd);
  ctx.stroke();
  requestAnimationFrame(draw);
}
function getEventLocation(e) {
  if (e.touches && e.touches.length == 1) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  else if (e.clientX && e.clientY) {
    return { x: e.clientX, y: e.clientY }
  }
}
onMounted(() => {
  try {
    canvas = document.getElementById('pixelCanvas');
    ctx = canvas.getContext('2d');
    draw();
    const styles = getComputedStyle(document.documentElement);
    darkColor = styles.getPropertyPriority('--bs-dark');
    lightColor = styles.getPropertyValue('--bs-light');
    redColor = styles.getPropertyValue('--bs-red');
    ctxMenu = document.querySelector('.ctx-menu');
    for (let form in modals) {
      const id = modals[form].id;
      const doc = document.getElementById(id);
      if (doc)
        modals[form].object = new bootstrap.Modal(document.getElementById(id));
    }
  }
  catch (err) {
    emit('toast', { message: err?.response?.data?.error || err?.message || "Something unexpected happened 0_0", type: 'error' });
  }
})
</script>

<style lang="css" scoped>
.ctx-menu {
  display: none;
  position: absolute;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.ctx-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ctx-menu-element {
  padding: 8px 12px;
}
</style>