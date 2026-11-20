// Scene 02 — Clean modular continuation without VYRA or ending messages

let scene2Active = false;

// حالة التكبير والتحريك لنافذة فحص الورقة الممزقة (torn.jpg)
let tornScale = 1;
let tornPosX = 0;
let tornPosY = 0;
let isDraggingTorn = false;
let dragStartX = 0;
let dragStartY = 0;
let tornEventsBound = false;

function applyTornTransform() {
    const card = document.getElementById('torn-paper-card');
    if (!card) return;
    card.style.transform = `translate(${tornPosX}px, ${tornPosY}px) scale(${tornScale})`;
}

function resetTornView() {
    tornScale = 1;
    tornPosX = 0;
    tornPosY = 0;
    applyTornTransform();
}

function openTornPageClue() {
    const tornView = document.getElementById('torn-page-view');
    if (!tornView) return;
    resetTornView();
    if (typeof gameState !== 'undefined') {
        gameState.modalOpen = true;
    }
    tornView.classList.remove('hidden');
}

function closeTornPageClue() {
    const tornView = document.getElementById('torn-page-view');
    if (!tornView) return;
    tornView.classList.add('hidden');
    if (typeof gameState !== 'undefined') {
        gameState.modalOpen = false;
    }
}

function bindTornPageEvents() {
    if (tornEventsBound) return;
    tornEventsBound = true;

    // كبسة زر الإيميل على اللابتوب لإظهار/إخفاء رسالة البريد
    const openEmailBtn = document.getElementById('open-email-btn');
    const emailPanel = document.getElementById('email-message-panel');
    if (openEmailBtn && emailPanel) {
        openEmailBtn.addEventListener('click', () => {
            emailPanel.classList.toggle('hidden');
        });
    }

    // فتح الورقة الممزقة (torn.jpg) من الأرشيف
    const btnTornPage = document.getElementById('btn-torn-page');
    if (btnTornPage) {
        btnTornPage.addEventListener('click', () => {
            const computerModal = document.getElementById('computer-modal');
            if (computerModal) {
                computerModal.classList.add('hidden');
            }
            openTornPageClue();
        });
    }

    const zoomInBtn = document.getElementById('torn-zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            tornScale = Math.min(2.5, Number((tornScale + 0.25).toFixed(2)));
            applyTornTransform();
        });
    }

    const zoomOutBtn = document.getElementById('torn-zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            tornScale = Math.max(0.75, Number((tornScale - 0.25).toFixed(2)));
            if (tornScale <= 1) {
                tornPosX = 0;
                tornPosY = 0;
            }
            applyTornTransform();
        });
    }

    const resetBtn = document.getElementById('torn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTornView);
    }

    const closeBtn = document.getElementById('torn-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTornPageClue);
    }

    const backdrop = document.querySelector('.torn-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeTornPageClue);
    }

    const viewport = document.getElementById('torn-viewport');
    if (viewport) {
        viewport.addEventListener('mousedown', (e) => {
            if (tornScale <= 1) return;
            isDraggingTorn = true;
            dragStartX = e.clientX - tornPosX;
            dragStartY = e.clientY - tornPosY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingTorn) return;
            tornPosX = e.clientX - dragStartX;
            tornPosY = e.clientY - dragStartY;
            applyTornTransform();
        });

        window.addEventListener('mouseup', () => {
            isDraggingTorn = false;
        });
    }

    // عند التقاط الورقة المخبأة، نعرض الدليل (torn.jpg) مباشرة بعد تأكيد الدليل
    const takeClueBtn = document.getElementById('take-clue-btn');
    if (takeClueBtn && !takeClueBtn.dataset.tornBound) {
        takeClueBtn.dataset.tornBound = 'true';
        takeClueBtn.addEventListener('click', () => {
            setTimeout(() => {
                const popup = document.getElementById('clue-popup');
                if (popup && !popup.classList.contains('hidden')) {
                    popup.classList.add('hidden');
                    openTornPageClue();
                }
            }, 80);
        });
    }
}

window.openNotebook = function () {
    openTornPageClue();
};

function startScene02() {
    if (scene2Active) return;
    scene2Active = true;

    const cineScreen = document.getElementById('cinematic-screen');
    const cineText = document.getElementById('cinematic-text');

    if (cineScreen) {
        cineScreen.classList.remove('active');
    }
    if (cineText) {
        cineText.innerHTML = '';
    }

    if (typeof gameState !== 'undefined') {
        gameState.sceneEnded = false;
        gameState.modalOpen = false;
        gameState.started = true;
    }

    buildScene02Modals();
    bindScene02Events();
    unlockPhotoInArchive();

    if (typeof showDialogue === 'function') {
        showDialogue('Something unlocked inside the file...', null, 36, () => {
            if (typeof closeDialogue === 'function') {
                closeDialogue();
            }
        });
    }
}

function buildScene02Modals() {
    if (!document.getElementById('photo-modal')) {
        const photoModal = document.createElement('div');
        photoModal.id = 'photo-modal';
        photoModal.className = 'modal hidden';
        photoModal.innerHTML = `
            <div class="modal-window">
                <div class="modal-header">
                    <span>PHOTO INSPECTION</span>
                    <button class="close-modal" data-target="photo-modal">✕</button>
                </div>
                <div class="modal-body center-text">
                    <h3>OLD RESEARCH INSTITUTE</h3>
                    <p>You examine the entrance... A small engraved symbol is visible near the door: <strong style="color:#ff4d6d;">86</strong></p>
                    <button id="open-city-map-btn" class="cyber-btn">OPEN CITY MAP</button>
                </div>
            </div>
        `;
        document.body.appendChild(photoModal);
    }

    if (!document.getElementById('city-map-modal')) {
        const mapModal = document.createElement('div');
        mapModal.id = 'city-map-modal';
        mapModal.className = 'modal hidden';
        mapModal.innerHTML = `
            <div class="modal-window">
                <div class="modal-header">
                    <span>MAP VIEW</span>
                    <button class="close-modal" data-target="city-map-modal">✕</button>
                </div>
                <div class="modal-body center-text">
                    <p>Marked location: <strong style="color:#8ab4f8;">Sector 04 — Old Research Institute</strong></p>
                    <p style="color:#ff4d6d;">Symbol 86 noted at the entrance.</p>
                </div>
            </div>
        `;
        document.body.appendChild(mapModal);
    }
}

function unlockPhotoInArchive() {
    const lockedPhoto = document.querySelector('.file-item.locked');
    if (lockedPhoto) {
        lockedPhoto.classList.remove('locked');
        lockedPhoto.id = 'btn-unknown-photo';
        lockedPhoto.textContent = '🖼️ UNKNOWN PHOTO';
    }
}

function bindScene02Events() {
    document.querySelectorAll('#photo-modal .close-modal, #city-map-modal .close-modal').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.add('hidden');
            }
            if (typeof gameState !== 'undefined') {
                gameState.modalOpen = false;
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'btn-unknown-photo' || e.target.closest('#btn-unknown-photo'))) {
            const photoModal = document.getElementById('photo-modal');
            if (photoModal) {
                if (typeof gameState !== 'undefined') {
                    gameState.modalOpen = true;
                }
                photoModal.classList.remove('hidden');
            }
        }

        if (e.target && e.target.id === 'open-city-map-btn') {
            const photoModal = document.getElementById('photo-modal');
            const mapModal = document.getElementById('city-map-modal');
            if (photoModal) photoModal.classList.add('hidden');
            if (mapModal) mapModal.classList.remove('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', bindTornPageEvents);
if (document.readyState !== 'loading') {
    bindTornPageEvents();
}
