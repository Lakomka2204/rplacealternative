<template>
    <footer class="container-fluid d-flex flex-row justify-content-between align-items-center hfooter">
        <div>Made by Lakomka</div>
        <button class="btn btn-outline-primary btn-lg fw-bold" @click="placePixel()" :disabled="isBusy">{{ displayPlace
        }}</button>
        <div class="dropdown">
            <button class="dropdown-toggle btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown"
                aria-expanded="false">Current color:
                <span :style="getBtnColor(current)">{{ current.name }}</span>
                <br>
                Choose color</button>
            <ul class="dropdown-menu">
                <li v-for="color of colors" :key="color.color">
                    <button :disabled="!color?.color" class="dropdown-item" :style="getBtnColor(color)" type="button"
                        @click="setCurrent(color)">{{ color.name }}</button>
                </li>
            </ul>
        </div>
    </footer>
</template>

<script setup>
import axios from 'axios';
import { ref, onMounted, toRef } from 'vue';
const colors = ref([]);
const current = ref(colors?.value[0] ?? { name: "None" });
const emit = defineEmits(['placed', 'toast']);
const props = defineProps({
    cooldown: Number,
});
// expose navbar.isloggedin to app.vue and watch for it, then on loggedin = true => checkCooldown, else => releaseButton
defineExpose({ putOnCooldown, releaseButton, checkCooldown });
const isBusy = ref(false);
const cd = toRef(() => props.cooldown);
let intervalId;
const displayPlace = ref("Place Pixel");
function releaseButton() {
    console.timeEnd('release');
    clearInterval(intervalId);
    displayPlace.value = 'Place Pixel';
    isBusy.value = false;
}
function putOnCooldown(releaseDate) {
    if (!isBusy.value)
        isBusy.value = true;
    displayPlace.value = "...";
    intervalId = setInterval(() => {
        var now = new Date().getTime();
        var remaining = releaseDate - now;
        var hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        let outp = [];
        if (hours > 0)
            outp.push(hours.toString().padStart(2, '0'));
        outp.push(minutes.toString().padStart(2, '0'));
        outp.push(seconds.toString().padStart(2, '0'));
        displayPlace.value = outp.join(':');
    }, 1000);
    console.time('release');
    setTimeout(releaseButton, releaseDate - new Date().getTime());
}
function placePixel() {
    isBusy.value = true;
    displayPlace.value = "...";
    emit('placed', current.value);
}
function setCurrent(color) {
    if (!color?.color) return;
    current.value = color;
}
function getBtnColor(color) {
    if (!color?.color || ['#000000', '#ffffff'].includes(color.color.toLowerCase()))
        return null;
    else return { color: color.color };
}
async function checkCooldown() {
    try {
        const res = await axios.get('/users/mycd');
        const cd = new Date(res.data.cd);
        if (cd > new Date())
            putOnCooldown(cd);
    }
    catch {
        emit('toast', { message: "Failed to get user data, please reload the page.", type: "error" });
    }
}
onMounted(async () => {
    try {
        const res = await axios.get('/pixels/canvascolors');
        colors.value = res.data;
    }
    catch (ex) {
        colors.value = [{
            name: "Failed to fetch colors, see console for details",
        }]
    }
    await checkCooldown();
});
</script>

<style lang="scss" scoped></style>