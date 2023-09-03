<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container">
      <a class="navbar-brand" href="/">r/place Alternative</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-3">
          <li class="nav-item btn" id="pingpopover" @click="togglePingPopover" data-bs-toggle="popover"
            data-bs-placement="bottom" data-bs-content="Calculating">
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
              <li v-if="isLoggedIn"><a class="dropdown-item" href="#" @click="getAccountInfo()">Account</a></li>
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
  <Modal title="Account info" :id="accountModalId">
    <template #modal-body>
      <span v-if="accountInfo.error && !accountInfo.id" class="text-danger text-center mx-auto">
        {{ accountInfo.error }}
      </span>
      <div :hidden="!accountInfo.id" class="container">
        <div class="row gap-3">
          <label class="col-sm-2 col-form-label text-secondary w-25" for="ui-id">
            <small>ID</small>
          </label>
          <input id="ui-id" readonly class="form-control-plaintext w-auto flex-grow-1" :value="accountInfo.id">
        </div>
        <div class="row gap-3">
          <label class="col-sm-2 col-form-label text-secondary w-25" for="ui-username">
            <small>Username</small>
          </label>
          <input id="ui-username" readonly class="form-control-plaintext w-auto flex-grow-1"
            :value="accountInfo.username">
          <button class="btn btn-link w-25 flex-grow-1" :data-bs-target="changeUsernameId" data-bs-toggle="modal">Change</button>
        </div>
        <div class="row gap-3">
          <label class="col-sm-2 col-form-label text-secondary w-25" for="ui-email">
            <small>Email</small>
          </label>
          <input id="ui-email" readonly class="form-control-plaintext w-auto flex-grow-1" :value="accountInfo.email">
          <button class="btn btn-link w-25 flex-grow-1" @click="showEmail">Show</button>
        </div>
        <div class="row gap-3 align-items-center">
          <label class="col-sm-2 col-form-label text-secondary w-25" for="ui-role">
            <small>Role</small>
          </label>
          <input id="ui-role" readonly class="form-control-plaintext w-50 " :value="accountInfo.role">
        </div>
        <div class="row gap-3 align-items-center">
          <label class="col-sm-2 col-form-label text-secondary w-25" for="ui-reg">
            <small>Registration date</small>
          </label>
          <input id="ui-reg" readonly class="form-control-plaintext w-auto flex-grow-1"
            :value="new Date(accountInfo.createdAt).toUTCString()">
        </div>
      </div>
      <div class="container d-flex" v-if="!accountInfo.id">
        <div class="spinner-border mx-auto align-self-center" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

    </template>
    <template #modal-footer>
      <button class="btn btn-outline-danger" @click="toggleModal(accountModal,delAccountModal)">Delete
        Account</button>
      <button class="btn btn-secondary" data-bs-dismiss="modal" :data-bs-target="accountModalId">Close</button>
    </template>
  </Modal>
  <Modal title="Delete Account" :id="deleteAccountId">
    <template #modal-body>
      <h4 class="fw-bold text-danger p-0 m-0">Warning</h4>
      All your 3rd party links will <strong>not</strong> be unlinked after you delete account and therefore you will not be able to login using them after you delete account.
    </template>
    <template #modal-footer>
      <button data-bs-dismiss="modal" :data-bs-target="deleteAccountId" class="btn btn-secondary">Cancel</button>
      <button @click="deleteAccount" class="btn btn-danger">Delete</button>
    </template>
  </Modal>
  <form class="needs-validation" novalidate @submit.prevent="loginSubmit">
    <Modal :id="lModalId" title="Login to the account">
      <template #modal-body>
        <div class="input-group mb-3 has-validation">
          <label for="loginUsername" class="input-group-text user-select-none w-25 justify-content-center">Email</label>
          <input :disabled="busy" type="email" id="loginUsername" name="email" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Email" v-model="email" required minlength="3" />
        </div>
        <div class="input-group mb-3 has-validation">
          <label for="loginPassword"
            class="input-group-text user-select-none w-25 justify-content-center">Password</label>
          <input :disabled="busy" type="password" name="password" id="loginPassword" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Username" v-model="password" required minlength="3" />
        </div>
        <div class="input-group mb-3">
          <label class="input-group-text user-select-none justify-content-center gap-2">
            Or login using
            <i class="bi bi-info-circle" data-bs-toggle="tooltip" data-bs-html="true"
              :data-bs-title="thirdpartywarning"></i>
          </label>
          <a :disabled="busy" type="button" class="form-control text-center text-decoration-none discord-color"
            href="/oauth/discord">Discord</a>
          <a :disabled="busy" type="button" class="form-control text-center text-decoration-none google-color"
            href="/oauth/google">Google</a>
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
        <div class="input-group mb-3 has-validation">
          <label for="registerPassword"
            class="input-group-text user-select-none w-25 justify-content-center">Password</label>
          <input :disabled="busy" type="password" name="password" id="registerPassword" placeholder="Minimum 3 characters"
            class="form-control" aria-label="Username" v-model="password" required minlength="3" />
        </div>
        <div class="d-flex gap-2">
          <label class="mb-3 user-select-none justify-content-center">
            Create account using
          </label>
          <i class="bi bi-info-circle" data-bs-toggle="tooltip" data-bs-html="true"
            :data-bs-title="thirdpartywarning"></i>
        </div>
        <div class="input-group mb-3">
          <a :disabled="busy" type="button" class="form-control text-center text-decoration-none discord-color"
            href="/oauth/discord">Discord</a>
        </div>
        <div class="input-group mb-3">
          <a :disabled="busy" type="button" class="form-control text-center text-decoration-none google-color"
            href="/oauth/google">Google</a>
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
import { toRef, watch, ref, onMounted, reactive } from 'vue';
import Modal from "./Modal.vue";
import axios from 'axios';
const userInfoLabels = {
  id: "ID",
  username: "Username",
  role: "Type",
  email: "Email",
  createdAt: "Registration date",
}
const username = ref();
const password = ref();
const email = ref();
const loginError = ref();
const registerError = ref();
const busy = ref(false);
const isLoggedIn = ref(false);
const isAdmin = ref(false);
const isDarkTheme = ref(false);
const thirdpartywarning = ref(`After logging in with 3rd party accounts the authorization tokens 
<strong>will be revoked immediately</strong>
<br>
Default scopes for account: 
<ul>
  <li>Account ID</li>
  <li>Account Email</li>
  <li>Primary name</li>
  </ul>`)
const SocketStatus = ['Idle', 'Connecting', 'Connected', 'Con Error', 'Reconnected', 'Recon Error'];
const initAccountInfo = {
  id: null,
  username: null,
  email: null,
  role: null,
  integrations: [],
  createdAt: new Date(0),
  error: null
}
const accountInfo = reactive({ ...initAccountInfo })
const connectionStatus = ref(SocketStatus[0]);
watch(() => props.conStatus, (newStatus) => {
  connectionStatus.value = SocketStatus[newStatus];
  socketerror = [3, 5].includes(newStatus);
});
let socketerror = false;
let loginModal, regModal, accountModal, changeUsernameModal, delAccountModal;
const lModalId = "loginModal";
const rModalId = 'registerModal';
const accountModalId = 'myaccountModal';
const changeUsernameId = "uchangeModal";
const deleteAccountId = 'delaccountModal';

const emit = defineEmits(['toast', 'socketping']);
watch(() => props.ping, (newPing) => {
  setPopoverText(`Ping: ${newPing}ms`);
});

const props = defineProps({
  online: Number,
  coords: Object,
  conStatus: Number,
  ping: Number
});
let toggle = false;
function toggleModal(oldModal,newModal){
  oldModal.hide();
  newModal.show();
}
async function deleteAccount(ev)
{
  try{
    await axios.delete('/users/me');
    logout();
    delAccountModal.hide();
  }
  catch (err) {
    emit('toast',{message: err?.data || err.message || "Couldn't delete account because of an internal error, try again in a few minutes.",type:"error" });
  }
}
async function getAccountInfo() {
  accountModal.show();
  if (!Cookies.get('u'))
    accountInfo.error = "You are not logged in";
  else if (!accountInfo.id) {
    console.log('cookie ');
    if (!accountInfo.id || accountInfo.error)
      try {
        const res = await axios.get('/users/me');
        for (let resProp of Object.keys(res.data)) {
          if (userInfoLabels[resProp])
            accountInfo[resProp] = res.data[resProp]
        }
        accountInfo.error = null;
        isLoggedIn.value = res?.data?.id != undefined;
        isAdmin.value = res.data.role == 'admin';
      }
      catch
      {
        accountInfo.error = "Error fetching user. Please clear your cache or relog.";
      }
  }
}
async function showEmail(ev) {
  ev.target.remove();
  const e = document.getElementById('ui-email');
  try {
    const res = await axios.get('/users/my/email');
    accountInfo.email = res.data;
  }
  catch (err) {
    emit('toast', { message: err?.response?.data?.error || err.message || "Who let the bro cook?", type: 'error' });
  }
}
function setPopoverText(text) {
  const popover = bootstrap.Popover.getInstance('#pingpopover');
  popover.setContent({
    '.popover-body': text
  })
}
function togglePingPopover() {
  if (socketerror)
    return setPopoverText('Connection error');
  toggle = !toggle;
  if (toggle)
    emit('socketping');
  else {
    setPopoverText("Calculating")
  }
}
async function resCD() {
  try {
    const res = await axios.patch('/admin/resetcooldown');
    if (res.status == 200)
      emit('toast', { message: 'Cooldown has been reset. Reload the page.', type: 'success' })
  }
  catch (err) {
    console.error(err);
    emit('toast', { message: err?.response?.data?.error || err?.response?.data || err.message, type: 'error' });
  }
}
function logout(ev) {
  Cookies.remove('u', { sameSite: 'Strict' });
  isLoggedIn.value = false;
  isAdmin.value = false;
  emit('toast', { message: 'You logged out.', type: 'info' })
}
defineExpose({ isLoggedIn });

async function checkUser() {
  try {
    if (Cookies.get('u')) {
      const res = await axios.get('/users/me');
      for (let resProp of Object.keys(res.data)) {
        if (userInfoLabels[resProp])
          accountInfo[resProp] = res.data[resProp]
      }
      accountInfo.error = null;
      isLoggedIn.value = res?.data?.id != undefined;
      isAdmin.value = res.data.role == 'admin';
    }
  }
  catch
  {
    emit('toast', { message: "Error fetching user. Please clear your cache or relog.", type: 'error' });
  }
}
onMounted(async () => {
  isDarkTheme.value = Cookies.get('theme') === 'true' || false;
  // check code authorization
  const url = new URL(window.location);
  const oauthUsername = url.searchParams.get('lu');
  const loginMethod = url.searchParams.get('lm');
  const error = url.searchParams.get("error");
  if (error) {
    window.history.replaceState({}, '', '/');
    setTimeout(() => emit('toast', { message: error, type: 'error' }), 500);
  }
  if (oauthUsername) {
    window.history.replaceState({}, '', '/');
    setTimeout(() => emit('toast', { message: `Logged in via ${loginMethod}. Welcome ${oauthUsername}`, type: 'success' }), 500);
  }
  await checkUser();
  loginModal = new bootstrap.Modal(document.getElementById(lModalId));
  regModal = new bootstrap.Modal(document.getElementById(rModalId));
  accountModal = new bootstrap.Modal(document.getElementById(accountModalId));
  delAccountModal = new bootstrap.Modal(document.getElementById(deleteAccountId));
  changeUsernameModal = new bootstrap.Modal(document.getElementById(changeUsernameId));
});
watch(isDarkTheme, (newTheme) => {
  document.documentElement.setAttribute('data-bs-theme', newTheme ? "dark" : "light");
  Cookies.set('theme', newTheme, { sameSite: "Strict", expires: 7 });
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
    Cookies.set('u', res.headers.getAuthorization(), { sameSite: 'Strict', expires: 7 });
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
    registerError.value = err?.response?.data?.error || err?.response?.data || err?.message || "Something unexpected happened";
  }
  finally {
    busy.value = false;
  }
}
async function loginSubmit(ev) {
  try {
    loginError.value = '';
    let uname = "...";
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
      Cookies.set('u', res.headers.getAuthorization(), { sameSite: 'Strict', expires: 7 });
      isLoggedIn.value = res.status == 200;
    }
    if (isLoggedIn.value) {
      loginModal.hide();
      emit('toast', { message: 'Logged in as ' + uname, type: 'success' });
      ev.target.classList.remove('was-validated');
    }
    username.value = email.value = password.value = '';
    await checkUser();
    return !loginError;
  }
  catch (err) {
    loginError.value = err?.response?.data?.error || err?.response?.data || err?.message || "Something unexpected happened";
  }
  finally {
    busy.value = false;
  }
}

</script>

<style lang="scss" scoped>
.discord-color {
  background-color: #5865F2;
  color: var(--bs-white);
}

.google-color {
  background-color: #4285F4;
  color: var(--bs-white);
}</style>