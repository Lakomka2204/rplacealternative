<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container">
      <a class="navbar-brand" href="#">r/place Alternative</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-3">
          <li class="nav-item btn" id="pingpopover" @click="togglePingPopover" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-content="Calculating">
            Connection: {{ connectionStatus }}
          </li>
          <li class="nav-item">
            Coordinates ( X: {{ props.coords.x }} Y: {{ props.coords.y }} )
          </li>
          <li class="nav-item">
            Online users: {{ props.online ?? -1 }}
          </li>
          <button class="nav-item btn" :class="{ 'btn-outline-warning': isDarkTheme, 'btn-outline-info': !isDarkTheme }"
            @click="isDarkTheme = !isDarkTheme">
            <i v-if="isDarkTheme" class="bi bi-brightness-high-fill"></i>
            <i v-else class="bi bi-moon-fill"></i>
          </button>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Account
            </a>
            <ul class="dropdown-menu">
            <li v-if="isAdmin"><button class="dropdown-item" @click="resCD()">Reset cooldown</button></li>
              <li v-if="isLoggedIn"><a class="dropdown-item text-danger" href="#" @click="logout">Logout</a></li>
              <div v-else>
                <li><button class="dropdown-item" @click="loginModal.show()">Login</button></li>
                <li><button class="dropdown-item" @click="regModal.show()">Register</button></li>
              </div>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
  <form class="needs-validation" novalidate @submit.prevent="loginSubmit">
    <Modal :id="lModalId" title="Login to the account">
      <template #modal-body>
        <div class="input-group mb-3 has-validation">
          <label for="loginUsername" class="input-group-text user-select-none w-25 justify-content-center">Email</label>
          <input :disabled="busy" type="email" id="loginUsername" name="email" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Email" v-model="email" required minlength="3" />
        </div>
        <div class="input-group has-validation">
          <label for="loginPassword"
            class="input-group-text user-select-none w-25 justify-content-center">Password</label>
          <input :disabled="busy" type="password" name="password" id="loginPassword" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Username" v-model="password" required minlength="3" />
        </div>
      </template>
      <template #modal-footer>
        <div class="text-danger mx-auto">{{ loginError }}</div>
        <button type="submit" :disabled="busy" class="btn btn-primary" style="min-width: 30%;">
          <span v-if="busy">Logging you in...</span>
          <span v-else>Login</span>
        </button>
      </template>
    </Modal>
  </form>
  <form class="needs-validation" novalidate @submit.prevent="registerSubmit">
    <Modal :id="rModalId" title="Create new account">
      <template #modal-body>
        <div class="input-group mb-3 has-validation">
          <label for="registerUsername"
            class="input-group-text user-select-none w-25 justify-content-center">Username</label>
          <input :disabled="busy" type="text" id="registerUsername" name="username" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Username" v-model="username" required minlength="3" />
        </div>
        <div class="input-group mb-3 has-validation">
          <label for="registerEmail" class="input-group-text user-select-none w-25 justify-content-center">Email</label>
          <input :disabled="busy" type="email" id="registerEmail" name="email" placeholder="Minimum 10 characters"
            class="form-control" aria-label="Email" v-model="email" required minlength="10" />
        </div>
        <div class="input-group has-validation">
          <label for="registerPassword"
            class="input-group-text user-select-none w-25 justify-content-center">Password</label>
          <input :disabled="busy" type="password" name="password" id="registerPassword" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Username" v-model="password" required minlength="3" />
        </div>
      </template>
      <template #modal-footer>
        <div class="text-danger mx-auto">{{ registerError }}</div>
        <button type="submit" :disabled="busy" class="btn btn-primary" style="min-width: 30%;">
          <span v-if="busy">Logging you in...</span>
          <span v-else>Register</span>
        </button>
      </template>
    </Modal>
  </form>
</template>

<script setup>
import Cookies from 'js-cookie';
import { toRef, watch, ref, onMounted } from 'vue';
import Modal from "./Modal.vue";
import axios from 'axios';
const username = ref();
const password = ref();
const email = ref();
const loginError = ref();
const registerError = ref();
const busy = ref(false);
const isLoggedIn = ref(false);
const isAdmin = ref(false);
const isDarkTheme = ref(false);
const SocketStatus = ['Idle','Connecting','Connected','Con Error','Reconnected','Recon Error'];
const connectionStatus = ref(SocketStatus[0]);
watch(() => props.conStatus,(newStatus) => {
  connectionStatus.value = SocketStatus[newStatus];
  socketerror = [3,5].includes(newStatus);
});
let socketerror = false;
let loginModal, regModal;
const lModalId = "loginModal";
const rModalId = 'registerModal';
const emit = defineEmits(['toast','socketping']);
watch(()=> props.ping,(newPing) => {
  setPopoverText(`Ping: ${newPing}ms`);
});

const props = defineProps({
  online: Number,
  coords:Object,
  conStatus:Number,
  ping:Number
});
let toggle = false;
function setPopoverText(text)
{
  const popover = bootstrap.Popover.getInstance('#pingpopover');
  popover.setContent({
    '.popover-body':text
  })
}
function togglePingPopover()
{
  if (socketerror)
    return setPopoverText('Connection error');
  toggle = !toggle;
  if (toggle)
  emit('socketping');
else {
  setPopoverText("Calculating")
}
}
async function resCD()
{
  try{
    const res = await axios.patch('/admin/resetcooldown');
    if (res.status == 200)
    emit('toast',{message:'Cooldown has been reset. Reload the page.',type:'success'})
  }
  catch(err){
    console.error(err);
    emit('toast',{message:err?.response?.data?.error || err.message,type:'error'});
  }
}
function logout(ev) {
  Cookies.remove('u', { sameSite: 'Strict' });
  isLoggedIn.value = false;
  isAdmin.value=false;
  emit('toast',{message:'You logged out.',type:'info'})
}
defineExpose({isLoggedIn});
async function checkUser()
{
  try{
    if (Cookies.get('u')) {
      const res = await axios.get('/users/me');
      isLoggedIn.value = res?.data?.id != undefined;
      isAdmin.value = res.data.role == 'admin';
    }
  }
  catch
  {
    emit('toast',{message:"Error fetching user. Please clear your cache or relog.",type:'error'});
  }
}
onMounted(async() => {
  isDarkTheme.value = Cookies.get('theme') === 'true' || false;
  await checkUser();
  loginModal = new bootstrap.Modal(document.getElementById(lModalId));
  regModal = new bootstrap.Modal(document.getElementById(rModalId));
});
watch(isDarkTheme, (newTheme) => {
  document.documentElement.setAttribute('data-bs-theme', newTheme ? "dark" : "light");
  Cookies.set('theme', newTheme, { sameSite: "Strict", expires: 7});
});

async function registerSubmit(ev) {
  try {
    registerError.value = '';
    if (!ev.target.checkValidity())
      return registerError.value = "Please fill out all fields.";
    busy.value = true;
    const res = await axios.post('/auth/register', {
      username: username.value, email: email.value, password: password.value
    })
    Cookies.set('u', res.headers.getAuthorization(), { sameSite: 'Strict', expires: 7});
    isLoggedIn.value = res.status == 201;
    if (isLoggedIn.value) {
      console.log('reg suc');
      regModal.hide();
      emit('toast', { message: 'Successfully created account', type: 'success' });
      ev.target.classList.remove('was-validated');
    }
    await checkUser();
    username.value = email.value = password.value = '';
    return !registerError;
  }
  catch (err) {
    registerError.value = err?.response?.data?.error || err?.message || "Something unexpected happened";
  }
  finally {
    busy.value = false;
  }
}
async function loginSubmit(ev) {
  try {
    loginError.value = '';
    let uname="...";
    if (!isLoggedIn.value) {

      if (!ev.target.checkValidity())
        return loginError.value = "Please fill out all fields.";
      busy.value = true;
      const res = await axios.post('/auth/login',
        { email: email.value, password: password.value }
      );
      if (res.status != 200) {
        loginError.value = res?.data?.error;
      }
      uname = res.data.username;
      Cookies.set('u', res.headers.getAuthorization(), { sameSite: 'Strict', expires: 7});
      isLoggedIn.value = res.status == 200;
    }
    if (isLoggedIn.value) {
      loginModal.hide();
      emit('toast', { message: 'Logged in as '+uname, type: 'success' });
      ev.target.classList.remove('was-validated');
    }
    username.value = email.value = password.value = '';
    await checkUser();
    return !loginError;
  }
  catch (err) {
    loginError.value = err?.response?.data?.error || err?.message || "Something unexpected happened";
  }
  finally {
    busy.value = false;
  }
}

</script>