// Scene 02 — Clean modular continuation without VYRA or ending messages

let scene2Active = false;

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