const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 960;
canvas.height = 540;

// Load Room and Heroine Images (.jpg)
const roomBg = new Image();
roomBg.src = 'room.jpg';
let bgLoaded = false;
roomBg.onload = () => {
    bgLoaded = true;
};

const heroineImg = new Image();
heroineImg.src = 'heroine.jpg';
let heroineLoaded = false;
heroineImg.onload = () => {
    heroineLoaded = true;
};

// Game State
const gameState = {
    started: false,
    dialogueActive: false,
    modalOpen: false,
    messageArrived: false,
    messageRead: false,
    clueFound: false,
    sceneEnded: false
};

// Player Data & Movement (starts in the middle of the room)
const player = {
    x: 450,
    y: 395,
    width: 56,
    height: 96,
    speed: 4.5,
    facing: 'right',
    isMoving: false,
    walkCycle: 0
};

// Wide Room Walkable Boundaries (left, right, up, down across the room)
const walkableBounds = {
    minX: 35,
    maxX: 925,
    minY: 295,
    maxY: 525
};

// Compact Furniture Obstacles so movement feels free and spacious
const obstacles = [
    {
        name: 'Desk',
        x: 110,
        y: 345,
        width: 120,
        height: 45
    },
    {
        name: 'Bed',
        x: 520,
        y: 325,
        width: 165,
        height: 35
    },
    {
        name: 'Vanity',
        x: 790,
        y: 355,
        width: 85,
        height: 45
    }
];

// Interactive Points matched to Laptop (left desk) and Digital Clock 03:14 (right wall)
const interactables = [
    {
        id: 'computer',
        label: '[E] CHECK PC',
        x: 185,
        y: 365,
        radius: 135
    },
    {
        id: 'clock',
        label: '[E] EXAMINE CLOCK',
        x: 845,
        y: 375,
        radius: 150
    }
];

const keys = {};

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    if (
        key === 'w' || key === 'a' || key === 's' || key === 'd' ||
        key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright'
    ) {
        e.preventDefault();
    }

    if (
        key === 'e' &&
        !gameState.dialogueActive &&
        !gameState.modalOpen &&
        gameState.started
    ) {
        checkInteraction();
    }

    const dialogueBox = document.getElementById('dialogue-box');
    const isDialogueVisible = dialogueBox && !dialogueBox.classList.contains('hidden');

    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState.dialogueActive && isDialogueVisible) {
            handleDialogueAdvance();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mobile Touch Controls (Movement + Interact E)
function setupTouchControls() {
    const bindTouch = (id, keyName) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const press = (e) => {
            if (e) e.preventDefault();
            btn.classList.add('is-pressed');
            keys[keyName] = true;

            if (
                keyName === 'e' &&
                !gameState.dialogueActive &&
                !gameState.modalOpen &&
                gameState.started
            ) {
                checkInteraction();
            }
        };

        const release = (e) => {
            if (e) e.preventDefault();
            btn.classList.remove('is-pressed');
            keys[keyName] = false;
        };

        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
    };

    bindTouch('btn-up', 'arrowup');
    bindTouch('btn-down', 'arrowdown');
    bindTouch('btn-left', 'arrowleft');
    bindTouch('btn-right', 'arrowright');
    bindTouch('btn-action', 'e');
    bindTouch('touch-action-btn', 'e');
}

setupTouchControls();

// Rain Generator for Exterior Scene
function createRain(count = 120) {
    const rainLayer = document.getElementById('rain-layer');
    if (!rainLayer) return;

    rainLayer.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const drop = document.createElement('span');
        drop.classList.add('rain-drop');

        const leftPos = Math.random() * 105;
        const duration = 0.45 + Math.random() * 0.35;
        const delay = Math.random() * 1.5;
        const opacity = 0.3 + Math.random() * 0.5;

        drop.style.left = `${leftPos}%`;
        drop.style.animationDuration = `${duration}s`;
        drop.style.animationDelay = `-${delay}s`;
        drop.style.opacity = opacity;

        rainLayer.appendChild(drop);
    }
}

// ==========================================
// Web Audio API Sound Engine (Heavy Rain, Exact Lightning-Synced Thunder, PC Notification)
// ==========================================
let sharedAudioCtx = null;
let rainSourceNode = null;
let rainGainNode = null;
let rainPlaying = false;
let thunderShakeInterval = null;

function getAudioContext() {
    if (!sharedAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            sharedAudioCtx = new AudioCtx();
        }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
}

// Heavy Continuous Rain Sound
function startHeavyRainSound(volume = 0.22) {
    try {
        if (rainPlaying) {
            setRainVolume(volume, 0.5);
            return;
        }
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const bufferSize = audioCtx.sampleRate * 3;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.04 * white) / 1.04;
            lastOut = output[i];
            output[i] *= 2.8;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 950;
        bandpass.Q.value = 0.55;

        const highshelf = audioCtx.createBiquadFilter();
        highshelf.type = 'highshelf';
        highshelf.frequency.value = 2800;
        highshelf.gain.value = 5;

        rainGainNode = audioCtx.createGain();
        rainGainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        rainGainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.8);

        whiteNoise.connect(bandpass);
        bandpass.connect(highshelf);
        highshelf.connect(rainGainNode);
        rainGainNode.connect(audioCtx.destination);

        whiteNoise.start(0);
        rainSourceNode = whiteNoise;
        rainPlaying = true;
    } catch (err) {
        // Ignore audio errors silently
    }
}

function setRainVolume(targetVolume, duration = 0.8) {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx || !rainGainNode || !rainPlaying) return;
        const now = audioCtx.currentTime;
        rainGainNode.gain.cancelScheduledValues(now);
        rainGainNode.gain.setValueAtTime(Math.max(rainGainNode.gain.value, 0.0001), now);
        rainGainNode.gain.linearRampToValueAtTime(Math.max(targetVolume, 0.0001), now + duration);
    } catch (err) {
        // Ignore
    }
}

function stopRainSound(fadeDuration = 0.7) {
    try {
        if (!rainPlaying || !rainSourceNode || !rainGainNode) return;
        const audioCtx = getAudioContext();
        const src = rainSourceNode;
        const gain = rainGainNode;

        rainSourceNode = null;
        rainGainNode = null;
        rainPlaying = false;

        if (audioCtx) {
            const now = audioCtx.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
            gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
            setTimeout(() => {
                try {
                    src.stop();
                    src.disconnect();
                } catch (e) {}
            }, fadeDuration * 1000 + 80);
        } else {
            src.stop();
            src.disconnect();
        }
    } catch (err) {
        // Ignore
    }
}

// Loud, Deep Thunder Crack & Heavy Rumble
function playHeavyThunderSound(intensity = 1.0) {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const duration = 4.2;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + white * 0.099046;
            b1 = 0.96300 * b1 + white * 0.2965164;
            b2 = 0.57000 * b2 + white * 1.0526913;
            const pink = b0 + b1 + b2 + white * 0.1848;

            const t = i / audioCtx.sampleRate;
            const crack = t < 0.28 ? Math.sin(t * 110) * (1 - t / 0.28) * 2.1 : 0;
            const rumbleMod = 0.72 + 0.28 * Math.sin(t * 13) * Math.cos(t * 5.5);
            const subBoom = Math.sin(t * 48 * Math.PI) * Math.exp(-t * 2.2) * 0.9;
            data[i] = (pink * 0.52 * rumbleMod) + crack + subBoom;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(340, audioCtx.currentTime);
        lowpass.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + duration);

        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -8;
        compressor.knee.value = 12;
        compressor.ratio.value = 6;

        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;
        const peakGain = Math.min(1.0, 0.95 * intensity);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.55 * intensity, now + 0.85);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(compressor);
        compressor.connect(audioCtx.destination);

        source.start(now);
        source.stop(now + duration);
    } catch (err) {
        // Ignore audio errors silently
    }
}

function stopThunderShake(sleepingLayer) {
    if (thunderShakeInterval) {
        clearInterval(thunderShakeInterval);
        thunderShakeInterval = null;
    }
    if (sleepingLayer) {
        sleepingLayer.style.transform = 'translate(0px, 0px)';
    }
}

// Instantaneous Light Flash + Thunder Sound + Continuous Thunder Shake
function triggerLightningWithThunder(lightningFlash, sleepingLayer, intensity = 1.0) {
    if (lightningFlash) {
        lightningFlash.style.animation = 'none';
        lightningFlash.style.transition = 'none';
        lightningFlash.style.opacity = '0.96';
    }

    playHeavyThunderSound(intensity);

    stopThunderShake(sleepingLayer);
    if (sleepingLayer) {
        let tick = 0;
        thunderShakeInterval = setInterval(() => {
            tick++;
            if (tick > 22) {
                stopThunderShake(sleepingLayer);
                return;
            }
            const amp = Math.max(0.5, (1 - tick / 24) * 4 * intensity);
            const dx = (Math.random() * 2 - 1) * amp;
            const dy = (Math.random() * 2 - 1) * amp;
            sleepingLayer.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        }, 55);
    }

    requestAnimationFrame(() => {
        if (lightningFlash) {
            lightningFlash.style.transition = 'opacity 0.45s ease-out';
            lightningFlash.style.opacity = '0';
        }
    });
}

// Sudden PC Notification Sound via Web Audio API
function playPcNotificationSound() {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;

        const notes = [880, 1174.66];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.11);

            gain.gain.setValueAtTime(0.001, now + idx * 0.11);
            gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.11 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.22);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now + idx * 0.11);
            osc.stop(now + idx * 0.11 + 0.24);
        });
    } catch (err) {
        // Ignore browser audio restrictions silently
    }
}

// Typewriter & Portrait Dialogue System (strictly sequential, zero overlap)
let typingTimer = null;
let currentFullText = '';
let isTyping = false;
const dialogueQueue = [];
let onDialogueAdvanceCallback = null;

function setCutsceneImage(src) {
    const cutsceneLayer = document.getElementById('cutscene-layer');
    const cutsceneImg = document.getElementById('cutscene-img');
    const awakeLayer = document.getElementById('awake-layer');

    if (awakeLayer) {
        awakeLayer.classList.remove('show-scene');
        awakeLayer.classList.add('hidden');
    }

    if (cutsceneLayer && cutsceneImg) {
        cutsceneImg.src = src;
        cutsceneImg.style.animation = 'none';
        void cutsceneImg.offsetWidth;
        cutsceneImg.style.animation = '';
        cutsceneLayer.classList.remove('hidden');
        cutsceneLayer.classList.add('show-scene');
    }
}

function hideCutsceneImage() {
    const cutsceneLayer = document.getElementById('cutscene-layer');
    if (cutsceneLayer) {
        cutsceneLayer.classList.remove('show-scene');
        cutsceneLayer.classList.add('hidden');
    }
}

function startTypingText(text, portraitSrc = null, speed = 36, speakerName = 'LOLITA') {
    const box = document.getElementById('dialogue-box');
    const textEl = document.getElementById('dialogue-text');
    const avatarEl = document.getElementById('speaker-avatar');
    const nameEl = box ? box.querySelector('.speaker-name') : null;
    const nextEl = document.getElementById('next-prompt');

    if (nameEl) {
        nameEl.textContent = speakerName;
        nameEl.style.direction = 'ltr';
        nameEl.style.textAlign = 'left';
    }

    if (nextEl) {
        nextEl.textContent = 'Next';
        nextEl.style.direction = 'ltr';
        nextEl.style.textAlign = 'left';
    }

    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }

    if (avatarEl && portraitSrc) {
        avatarEl.src = portraitSrc;
        avatarEl.onerror = () => {
            avatarEl.classList.add('hidden');
        };
        avatarEl.classList.remove('hidden');
    } else if (avatarEl) {
        avatarEl.classList.add('hidden');
    }

    gameState.dialogueActive = true;
    currentFullText = String(text);
    textEl.style.direction = 'ltr';
    textEl.style.textAlign = 'left';
    textEl.textContent = '';
    box.classList.remove('hidden');

    let index = 0;
    isTyping = true;

    typingTimer = setInterval(() => {
        if (index < currentFullText.length) {
            textEl.textContent += currentFullText.charAt(index);
            index++;
        } else {
            clearInterval(typingTimer);
            typingTimer = null;
            isTyping = false;
        }
    }, speed);
}

function showDialogue(text, portraitSrc = null, speed = 36, onComplete = null, speakerName = 'LOLITA') {
    dialogueQueue.length = 0;
    onDialogueAdvanceCallback = onComplete;
    startTypingText(text, portraitSrc, speed, speakerName);
}

function handleDialogueAdvance() {
    if (!gameState.dialogueActive) return;

    const textEl = document.getElementById('dialogue-text');

    if (isTyping) {
        if (typingTimer) {
            clearInterval(typingTimer);
            typingTimer = null;
        }
        textEl.textContent = currentFullText;
        isTyping = false;
        return;
    }

    if (typeof onDialogueAdvanceCallback === 'function') {
        const cb = onDialogueAdvanceCallback;
        onDialogueAdvanceCallback = null;
        cb();
        return;
    }

    if (dialogueQueue.length > 0) {
        const nextItem = dialogueQueue.shift();
        startTypingText(
            nextItem.text,
            nextItem.portraitSrc,
            nextItem.speed,
            nextItem.speakerName || 'LOLITA'
        );
        return;
    }

    closeDialogue();
}

function closeDialogue() {
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }
    isTyping = false;
    gameState.dialogueActive = false;
    document.getElementById('dialogue-box').classList.add('hidden');

    if (dialogueQueue.length > 0) {
        const nextItem = dialogueQueue.shift();
        startTypingText(
            nextItem.text,
            nextItem.portraitSrc,
            nextItem.speed,
            nextItem.speakerName || 'LOLITA'
        );
    }
}

document.getElementById('dialogue-box').addEventListener('click', handleDialogueAdvance);

const nextPromptEl = document.getElementById('next-prompt');
if (nextPromptEl) {
    nextPromptEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDialogueAdvance();
    });
}

// Opening Sequence following steps 1 -> 5 -> Gameplay
document.getElementById('start-btn').addEventListener('click', (e) => {
    if (e && e.currentTarget && typeof e.currentTarget.blur === 'function') {
        e.currentTarget.blur();
    }
    document.getElementById('start-screen').classList.remove('active');

    startHeavyRainSound(0.22);

    const buildingScene = document.getElementById('building-scene');
    const sleepingLayer = document.getElementById('sleeping-layer');
    const sleepingImg = document.getElementById('sleeping-heroine');
    const lightningFlash = document.getElementById('lightning-flash');
    const awakeLayer = document.getElementById('awake-layer');
    const awakeImg = document.getElementById('awake-heroine');

    if (sleepingImg) {
        sleepingImg.src = 'sleeping.jpg';
        sleepingImg.style.display = 'block';
    }
    if (awakeImg) {
        awakeImg.src = 'awake-surprised.jpg';
        awakeImg.style.display = 'block';
    }

    createRain(120);

    buildingScene.classList.remove('hidden');
    requestAnimationFrame(() => {
        buildingScene.classList.add('active');
        setTimeout(() => {
            buildingScene.classList.add('zoom-in');
        }, 120);
    });

    setTimeout(() => {
        canvas.classList.add('room-entered');

        buildingScene.classList.remove('active');
        buildingScene.classList.add('hidden');
        buildingScene.classList.remove('zoom-in');

        setRainVolume(0.08, 0.7);

        if (sleepingLayer) {
            if (sleepingImg) {
                sleepingImg.style.animation = 'none';
                void sleepingImg.offsetWidth;
                sleepingImg.style.animation = '';
            }
            if (lightningFlash) {
                lightningFlash.style.animation = 'none';
                lightningFlash.style.opacity = '0';
            }
            sleepingLayer.classList.remove('hidden');
            sleepingLayer.classList.add('show-scene');
        }

        setTimeout(() => {
            triggerLightningWithThunder(lightningFlash, sleepingLayer, 1.0);
        }, 200);

        setTimeout(() => {
            triggerLightningWithThunder(lightningFlash, sleepingLayer, 0.92);
        }, 2900);

        setTimeout(() => {
            stopRainSound(0.7);
            stopThunderShake(sleepingLayer);

            if (lightningFlash) {
                lightningFlash.style.opacity = '0';
            }

            if (sleepingLayer) {
                sleepingLayer.classList.remove('show-scene');
                sleepingLayer.classList.add('hidden');
            }

            if (awakeLayer) {
                if (awakeImg) {
                    awakeImg.src = 'awake-surprised.jpg';
                    awakeImg.style.animation = 'none';
                    void awakeImg.offsetWidth;
                    awakeImg.style.animation = '';
                }
                awakeLayer.classList.remove('hidden');
                awakeLayer.classList.add('show-scene');
            }

            showDialogue('Hmm... What happened?', null, 36, () => {
                showDialogue('I was having a strange dream.', null, 36, () => {
                    setCutsceneImage('clock-scene.jpg');
                    showDialogue('Why am I awake at this hour?', null, 36, () => {
                        setCutsceneImage('pc-glow.jpg');
                        playPcNotificationSound();

                        const cutsceneImg = document.getElementById('cutscene-img');
                        if (cutsceneImg) {
                            cutsceneImg.style.filter = 'brightness(1.35) contrast(1.15)';
                            setTimeout(() => {
                                cutsceneImg.style.filter = 'brightness(1) contrast(1)';
                            }, 350);
                        }

                        showDialogue('Huh? Did someone send me a message?', null, 36, () => {
                            showDialogue("I should see what's going on.", null, 36, () => {
                                closeDialogue();
                                hideCutsceneImage();

                                gameState.started = true;
                                gameState.messageArrived = true;
                            });
                        });
                    });
                });
            });
        }, 6000);
    }, 3500);
});

// Collision Detection
function checkCollision(x, y, width, height) {
    const footBox = {
        x: x + 16,
        y: y + height - 12,
        width: width - 32,
        height: 10
    };

    for (const obs of obstacles) {
        if (
            footBox.x < obs.x + obs.width &&
            footBox.x + footBox.width > obs.x &&
            footBox.y < obs.y + obs.height &&
            footBox.y + footBox.height > obs.y
        ) {
            return true;
        }
    }

    return false;
}

// Update Player Position (free 4-directional movement across the room)
function updatePlayer() {
    if (
        !gameState.started ||
        gameState.dialogueActive ||
        gameState.modalOpen ||
        gameState.sceneEnded
    ) {
        player.isMoving = false;
        return;
    }

    let nextX = player.x;
    let nextY = player.y;

    player.isMoving = false;

    if (keys['w'] || keys['arrowup']) {
        nextY -= player.speed;
        player.isMoving = true;
    }

    if (keys['s'] || keys['arrowdown']) {
        nextY += player.speed;
        player.isMoving = true;
    }

    if (keys['a'] || keys['arrowleft']) {
        nextX -= player.speed;
        player.facing = 'left';
        player.isMoving = true;
    }

    if (keys['d'] || keys['arrowright']) {
        nextX += player.speed;
        player.facing = 'right';
        player.isMoving = true;
    }

    if (
        nextX >= walkableBounds.minX &&
        nextX + player.width <= walkableBounds.maxX &&
        !checkCollision(nextX, player.y, player.width, player.height)
    ) {
        player.x = nextX;
    }

    if (
        nextY >= walkableBounds.minY &&
        nextY + player.height <= walkableBounds.maxY &&
        !checkCollision(player.x, nextY, player.width, player.height)
    ) {
        player.y = nextY;
    }

    if (player.isMoving) {
        player.walkCycle += 0.25;
    } else {
        player.walkCycle = 0;
    }
}

// Interaction System
let activeTarget = null;
const promptEl = document.getElementById('interaction-prompt');

function updateInteractions() {
    activeTarget = null;

    for (const item of interactables) {
        const dist = Math.hypot(
            (player.x + player.width / 2) - item.x,
            (player.y + player.height / 2) - item.y
        );

        if (dist < item.radius) {
            activeTarget = item;
            break;
        }
    }

    if (
        activeTarget &&
        !gameState.modalOpen &&
        !gameState.dialogueActive &&
        !gameState.sceneEnded
    ) {
        promptEl.innerText = activeTarget.label;
        promptEl.style.left = `${activeTarget.x}px`;
        promptEl.style.top = `${activeTarget.y - 45}px`;
        promptEl.classList.remove('hidden');
    } else {
        promptEl.classList.add('hidden');
    }
}

// Check Interaction
function checkInteraction() {
    if (!activeTarget) return;

    if (activeTarget.id === 'computer') {
        if (!gameState.messageArrived) {
            showDialogue('The PC screen is currently idle.', null);
        } else {
            openModal('computer-modal');
            gameState.messageRead = true;
        }
    } else if (activeTarget.id === 'clock') {
        if (!gameState.messageRead) {
            showDialogue('The wall clock... its hands are stopped.', null);
        } else if (!gameState.clueFound) {
            openModal('clock-modal');
        } else {
            showDialogue('You already took the note from behind the clock.', null);
        }
    }
}

// Modal System
function openModal(id) {
    gameState.modalOpen = true;
    document.getElementById(id).classList.remove('hidden');
}

// Close Modals
document.querySelectorAll('.close-modal').forEach((btn) => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        document.getElementById(targetId).classList.add('hidden');
        gameState.modalOpen = false;

        if (
            targetId === 'computer-modal' &&
            gameState.messageRead &&
            !gameState.clueFound
        ) {
            showDialogue(
                '«Who sent me this message? And why did the clock stop?»',
                null
            );
        }
    });
});

// Open Archive Attachment
document.getElementById('open-archive-btn').addEventListener('click', () => {
    document.getElementById('archive-contents').classList.remove('hidden');
});

// Open Torn Page
document.getElementById('btn-torn-page').addEventListener('click', () => {
    document.getElementById('torn-page-view').classList.remove('hidden');
});

// Take Clock Clue
document.getElementById('take-clue-btn').addEventListener('click', () => {
    document.getElementById('clock-modal').classList.add('hidden');
    document.getElementById('clue-popup').classList.remove('hidden');
});

// Confirm Clue
document.getElementById('confirm-clue-btn').addEventListener('click', () => {
    document.getElementById('clue-popup').classList.add('hidden');

    gameState.modalOpen = false;
    gameState.clueFound = true;

    document.getElementById('notebook-btn').innerText = '📓 EVIDENCE (1)';

    showDialogue(
        '«What is the connection between this number and the file? Why was it hidden here?»',
        null
    );
});

// Render Loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgLoaded) {
        ctx.drawImage(roomBg, 0, 0, canvas.width, canvas.height);
    }

    if (gameState.messageArrived && !gameState.messageRead) {
        ctx.fillStyle = '#ff4d6d';
        ctx.fillRect(175, 290, 22, 16);

        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.fillText('✉', 180, 302);
    }

    if (gameState.started) {
        const bounceOffset = player.isMoving
            ? Math.abs(Math.sin(player.walkCycle)) * 4
            : 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(
            player.x + player.width / 2,
            player.y + player.height,
            player.width * 0.34,
            6,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        if (heroineLoaded) {
            ctx.save();

            if (player.facing === 'left') {
                ctx.translate(
                    player.x + player.width,
                    player.y - bounceOffset
                );
                ctx.scale(-1, 1);
                ctx.drawImage(
                    heroineImg,
                    0,
                    0,
                    player.width,
                    player.height
                );
            } else {
                ctx.drawImage(
                    heroineImg,
                    player.x,
                    player.y - bounceOffset,
                    player.width,
                    player.height
                );
            }

            ctx.restore();
        } else {
            ctx.fillStyle = '#ff66a3';
            ctx.fillRect(
                player.x,
                player.y - bounceOffset,
                player.width,
                player.height
            );
        }

        updatePlayer();
        updateInteractions();
    }

    requestAnimationFrame(draw);
}

draw();

// Responsive Game Scaling
function resizeGame() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / 960;
    const scaleY = windowHeight / 540;

    const scale = Math.min(scaleX, scaleY);

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);
window.addEventListener('DOMContentLoaded', resizeGame);
resizeGame();
