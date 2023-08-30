<script setup>
import { onMounted, ref, reactive, toRef, watch} from "vue";
import Navbar from "./components/Navbar.vue";
import { io } from 'socket.io-client';
import PlaceFooter from './components/PlaceFooter.vue';
import ToastHandler from './components/ToastHandler.vue';
import Cookies from "js-cookie";
import axios from "axios";
import CanvasBody from "./components/CanvasBody.vue";
const navbar = ref(null);
const bodyRef = ref(null);
const footer = ref(null);
const toastHandler = ref(null);
const cooldown = ref(10);
const pixels = ref([]);
const online = ref();
const isLoggedIn = toRef(() => navbar.value.isLoggedIn);
const ping = ref(0);
// 0 - idle
// 1 - connecting
// 2 - connected
// 3 - connect error
// 4 - reconnected
// 5 - reconnect error
const socketConnectionStatus = ref(0);
const canvasSize = reactive({
  x: -1,
  y: -1
});
const currentCords = reactive({
  x: -1,
  y: -1
})
function showToast(ev) {
  // ev.message
  // ev.type : [info,success,warn,error]
  // console.log('showtoast received',ev);
  toastHandler.value.show(ev.message, ev?.type ?? 'info');
  return true;
}
onMounted(async () => {
  //bootstrap popover initialization
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
  //bootstrap form validation
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
  //socket setup
  socket.on('connect',() => socketConnectionStatus.value = 2);
  socket.on('connect_error',(err) =>{
    socketConnectionStatus.value = 3;
    console.error('socket error',err);
  });
  socket.on('reconnect',(n) => {
    socketConnectionStatus.value =4;
  });
  socket.on('reconnect_error' ,(err) => {
    socketConnectionStatus.value = 5;
    console.error('socket error',err);
  });
  socket.on('reconnect_failed', () => socketConnectionStatus.value = 0);
  socket.on('initdata', data => {
    online.value = data.online;
    pixels.value = data.pixels;
  });
  socket.on('online', data => online.value = data);
  socket.on('placed', data => {
    // const {x,y,color} = data;
    pixels.value.push(data);
  });
  socket.on('placedresult', async res => {
    if (res.msg == "OK")
      await footer.value.checkCooldown();
    else {
      footer.value.releaseButton();
      showToast({ message: res.msg, type: "warn" });
    }
  });
  socket.on('pong',() => {
    console.timeEnd('ping')
    ping.value = Date.now() - start;
  });
  // init requests
  const res = await axios.get('/pixels/canvasinfo');
  canvasSize.x = +res.data.w;
  canvasSize.y = +res.data.h;
  cooldown.value = +res.data.cd;
  // additional setting
  watch(isLoggedIn, async (newVal) => {
    if (newVal)
      await footer.value.checkCooldown();
    else
    {
      footer.value.releaseButton();
      await bodyRef.value.checkauth();
    }
  });
});

const socket = io(`ws://`, {
  path: '/ws',
  reconnectionAttempts: 10,
});
let start;

function checkPing()
{
  console.time('ping')
  start = Date.now();
  socket.emit('ping');
  
}
function ppWrap(ev) {
  if (placePixel(ev))
    footer.value.releaseButton();
}
function placePixel(ev) {
  const token = Cookies.get('u');
  if (!token)
    return showToast({ message: "You're not logged in!", type: "warn" });
  const color = ev.color;
  if (!color)
    return showToast({ message: 'Please choose a valid color.', type: "warn" });
  const x = currentCords.x;
  const y = currentCords.y;
  if (x < 0 || x >= canvasSize.x || y < 0 || y >= canvasSize.y)
    return showToast({ message: "Invalid placement", type: "warn" });
  socket.emit('placed', { color, x, y, token });
}
function setCoords(ev) {
  currentCords.x = ev.x
  currentCords.y = ev.y
}
</script>

<template>
  <Navbar :online="online" @toast="showToast" :coords="currentCords" ref="navbar" :conStatus="socketConnectionStatus" @socketping="checkPing()" :ping="ping"/>
  <CanvasBody :pixels="pixels" ref="bodyRef" :cvsx="canvasSize.x" :cvsy="canvasSize.y" @changeCurrent="setCoords" @toast="showToast"/>
  <PlaceFooter  @placed="ppWrap" :cooldown="cooldown" ref="footer" />
  <ToastHandler ref="toastHandler" />
</template>
