/* ============================================
   ECOFICINA — Scanner AR & 3D Diagnostics Engine
   ============================================ */

import * as THREE from 'three';

// Automotive Part Presets
const PART_PRESETS = {
  coxim: {
    name: 'Coxim do Motor',
    subtitle: 'Iveco Stralis / Hi-Way · Part #580144321',
    confidence: '98.4%',
    wear: 'Moderado (68%)',
    wearDesc: 'Fissura e ressecamento no polímero intermediário',
    material: 'Nylon Fibra Carbono (CF) + Núcleo TPU',
    priceOld: 'R$ 780',
    priceEco: 'R$ 290',
    saving: 'Economize R$ 490 (63%)',
    co2: '4.2 kg de CO₂ evitados',
    type: 'cylinder-flange'
  },
  alternador: {
    name: 'Suporte do Alternador',
    subtitle: 'Iveco Daily 3.0 16V · Part #504065879',
    confidence: '97.1%',
    wear: 'Crítico (84%)',
    wearDesc: 'Fratura por fadiga na aba superior de fixação',
    material: 'Nylon CF 30% Reforçado',
    priceOld: 'R$ 580',
    priceEco: 'R$ 280',
    saving: 'Economize R$ 300 (52%)',
    co2: '3.6 kg de CO₂ evitados',
    type: 'bracket'
  },
  coletor: {
    name: 'Coletor de Admissão',
    subtitle: 'Iveco Tector 240E28 · Part #504118944',
    confidence: '99.2%',
    wear: 'Leve (35%)',
    wearDesc: 'Desgaste e deformação térmica nos dutos',
    material: 'ABS Reforçado + PETG Alta Temperatura',
    priceOld: 'R$ 1.200',
    priceEco: 'R$ 680',
    saving: 'Economize R$ 520 (43%)',
    co2: '8.4 kg de CO₂ evitados',
    type: 'manifold'
  },
  engrenagem: {
    name: 'Guia do Câmbio',
    subtitle: 'Iveco Eurocargo / Tector · Part #42536712',
    confidence: '96.8%',
    wear: 'Acentuado (72%)',
    wearDesc: 'Desgaste por atrito nos dentes de engate',
    material: 'Nylon CF de Ultra Baixo Atrito',
    priceOld: 'R$ 950',
    priceEco: 'R$ 510',
    saving: 'Economize R$ 440 (46%)',
    co2: '5.1 kg de CO₂ evitados',
    type: 'gear'
  }
};

// Global App State
let currentStream = null;
let currentFacingMode = 'environment';
let isScanning = false;
let selectedSample = 'coxim';
let torchActive = false;

// Three.js State
let scene, camera, renderer, currentMeshGroup, animId;
let renderMode = 'solid'; // 'solid', 'wireframe', 'xray'
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// DOM Elements
const videoEl = document.getElementById('camera-feed');
const targetBox = document.getElementById('target-box');
const targetBadgeText = document.getElementById('target-badge-text');
const btnScan = document.getElementById('btn-scan');
const btnFlipCamera = document.getElementById('btn-flip-camera');
const btnTorch = document.getElementById('btn-torch');
const sampleChips = document.querySelectorAll('.sample-chip');
const sampleLayer = document.getElementById('sample-layer');
const inputFile = document.getElementById('input-file');
const resultModal = document.getElementById('result-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const btnScanAgain = document.getElementById('btn-scan-again');
const btnOrderPrint = document.getElementById('btn-order-print');
const toastEl = document.getElementById('scanner-toast');
const toastMsg = document.getElementById('toast-msg');

// ============================================
// AUDIO FEEDBACK (Web Audio API Synthesizer)
// ============================================
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playScan() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (_) {}
  }

  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch (_) {}
  }
}
const sfx = new SoundEffects();

// ============================================
// CAMERA INITIALIZATION & CONTROLS
// ============================================
async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: currentFacingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    videoEl.srcObject = stream;
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(() => {});
      sampleLayer.classList.remove('active');
      document.getElementById('hud-status').textContent = 'ONLINE';
    };
  } catch (err) {
    console.warn('Câmera física não disponível ou permissão negada. Ativando modo de simulação com amostra visual:', err);
    loadSampleImage(selectedSample);
    document.getElementById('hud-status').textContent = 'SIMULAÇÃO';
  }
}

function flipCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera();
}

async function toggleTorch() {
  if (!currentStream) return;
  const track = currentStream.getVideoTracks()[0];
  if (!track) return;

  const capabilities = track.getCapabilities ? track.getCapabilities() : {};
  if (capabilities.torch) {
    torchActive = !torchActive;
    await track.applyConstraints({ advanced: [{ torch: torchActive }] });
    btnTorch.classList.toggle('active', torchActive);
  } else {
    showToast('Lanterna não suportada neste dispositivo.');
  }
}

function loadSampleImage(sampleKey) {
  selectedSample = sampleKey;
  const sampleMap = {
    coxim: '/engine.jpg',
    alternador: '/engine.jpg',
    coletor: '/engine.jpg',
    engrenagem: '/engine.jpg'
  };
  sampleLayer.style.backgroundImage = `url(${sampleMap[sampleKey] || '/engine.jpg'})`;
  sampleLayer.classList.add('active');
}

// ============================================
// SCANNING LOGIC & DIAGNOSIS
// ============================================
function triggerScan() {
  if (isScanning) return;
  isScanning = true;

  sfx.playScan();
  targetBox.classList.add('scanning');
  targetBadgeText.textContent = 'ANALISANDO REDE NEURAL...';
  btnScan.style.transform = 'scale(0.92)';

  // Simulate progressive telemetry scan
  let progress = 0;
  const interval = setInterval(() => {
    progress += 25;
    if (progress === 50) {
      targetBadgeText.textContent = 'CALCULANDO TOLERÂNCIAS...';
    } else if (progress === 75) {
      targetBadgeText.textContent = 'MAPEANDO DESGASTE 3D...';
    }
  }, 350);

  setTimeout(() => {
    clearInterval(interval);
    isScanning = false;
    targetBox.classList.remove('scanning');
    targetBadgeText.textContent = 'PEÇA DETECTADA (98%)';
    btnScan.style.transform = '';

    sfx.playSuccess();
    openDiagnosticResult(selectedSample);
  }, 1600);
}

function openDiagnosticResult(sampleKey) {
  const data = PART_PRESETS[sampleKey] || PART_PRESETS.coxim;

  // Fill in data
  document.getElementById('res-part-name').textContent = data.name;
  document.getElementById('res-part-meta').textContent = data.subtitle;
  document.getElementById('res-confidence').textContent = data.confidence;
  document.getElementById('res-wear').textContent = data.wear;
  document.getElementById('res-wear-desc').textContent = data.wearDesc;
  document.getElementById('res-material').textContent = data.material;
  document.getElementById('res-price-old').textContent = `${data.priceOld} nova`;
  document.getElementById('res-price-eco').textContent = `${data.priceEco} recondicionada`;
  document.getElementById('res-save-badge').textContent = data.saving;
  document.getElementById('res-co2').textContent = data.co2;

  // Open modal
  resultModal.classList.add('open');

  // Initialize or update 3D Model
  setTimeout(() => {
    init3DViewer(data.type);
  }, 100);
}

function closeResultModal() {
  resultModal.classList.remove('open');
  if (animId) {
    cancelAnimationFrame(animId);
  }
}

// ============================================
// THREE.JS 3D PART VIEWER
// ============================================
function init3DViewer(partType = 'cylinder-flange') {
  const container = document.getElementById('canvas-3d-container');
  const canvas = document.getElementById('three-canvas');
  if (!container || !canvas) return;

  const width = container.clientWidth || 360;
  const height = container.clientHeight || 240;

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 3.8);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00E676, 2.5);
    dirLight1.position.set(3, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00E5FF, 1.8);
    dirLight2.position.set(-3, -2, -2);
    scene.add(dirLight2);

    setupOrbitTouchEvents(container);
  } else {
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // Clear previous mesh
  if (currentMeshGroup) {
    scene.remove(currentMeshGroup);
  }

  // Create mechanical part geometry
  currentMeshGroup = createMechanicalPart(partType);
  scene.add(currentMeshGroup);

  // Start Animation Loop
  function animate() {
    animId = requestAnimationFrame(animate);
    if (!isDragging && currentMeshGroup) {
      currentMeshGroup.rotation.y += 0.008;
    }
    renderer.render(scene, camera);
  }

  if (animId) cancelAnimationFrame(animId);
  animate();
}

function createMechanicalPart(type) {
  const group = new THREE.Group();

  // Material according to current renderMode
  let mat;
  if (renderMode === 'wireframe') {
    mat = new THREE.MeshStandardMaterial({
      color: 0x00E676,
      wireframe: true,
      roughness: 0.2
    });
  } else if (renderMode === 'xray') {
    mat = new THREE.MeshPhysicalMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 1.2
    });
  } else {
    // Solid: Industrial reinforced polymer look (carbon fiber dark finish)
    mat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.35
    });
  }

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x00E676,
    metalness: 0.8,
    roughness: 0.2
  });

  if (type === 'cylinder-flange' || type === 'coxim') {
    // Coxim: Cylindrical base with metal inserts and damping ring
    const baseGeo = new THREE.CylinderGeometry(1, 1.15, 0.4, 32);
    const baseMesh = new THREE.Mesh(baseGeo, mat);
    group.add(baseMesh);

    const coreGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.7, 32);
    const coreMesh = new THREE.Mesh(coreGeo, accentMat);
    coreMesh.position.y = 0.35;
    group.add(coreMesh);

    const holeGeo = new THREE.TorusGeometry(0.5, 0.08, 16, 32);
    const holeMesh = new THREE.Mesh(holeGeo, accentMat);
    holeMesh.rotation.x = Math.PI / 2;
    holeMesh.position.y = 0.7;
    group.add(holeMesh);

    // 4 Flange bolt holes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16), accentMat);
      bolt.position.set(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9);
      group.add(bolt);
    }

  } else if (type === 'gear') {
    // Gear / Guia do Câmbio
    const gearBody = new THREE.CylinderGeometry(1.1, 1.1, 0.35, 18);
    const bodyMesh = new THREE.Mesh(gearBody, mat);
    group.add(bodyMesh);

    const centerHole = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 24);
    const holeMesh = new THREE.Mesh(centerHole, accentMat);
    group.add(holeMesh);

    // Gear teeth
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.4), mat);
      tooth.position.set(Math.cos(angle) * 1.18, 0, Math.sin(angle) * 1.18);
      tooth.rotation.y = -angle;
      group.add(tooth);
    }
  } else {
    // Bracket / Manifold
    const block1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.0), mat);
    group.add(block1);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 24), accentMat);
    arm.position.set(0.4, 0.6, 0);
    arm.rotation.z = -0.2;
    group.add(arm);

    const bush = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 16, 24), mat);
    bush.position.set(0.65, 1.1, 0);
    group.add(bush);
  }

  group.rotation.x = 0.3;
  return group;
}

function updateViewerRenderMode(mode) {
  renderMode = mode;
  document.querySelectorAll('.viewer-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  if (currentMeshGroup) {
    const activePart = PART_PRESETS[selectedSample]?.type || 'cylinder-flange';
    scene.remove(currentMeshGroup);
    currentMeshGroup = createMechanicalPart(activePart);
    scene.add(currentMeshGroup);
  }
}

function setupOrbitTouchEvents(container) {
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !currentMeshGroup) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    currentMeshGroup.rotation.y += deltaX * 0.01;
    currentMeshGroup.rotation.x += deltaY * 0.01;

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  // Touch support for mobile
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || !currentMeshGroup || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;

    currentMeshGroup.rotation.y += deltaX * 0.012;
    currentMeshGroup.rotation.x += deltaY * 0.012;

    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message) {
  toastMsg.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

// ============================================
// EVENT LISTENERS & BOOTSTRAP
// ============================================
function initEventListeners() {
  btnScan.addEventListener('click', triggerScan);
  btnFlipCamera.addEventListener('click', flipCamera);
  btnTorch.addEventListener('click', toggleTorch);

  // Sample Chips
  sampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sampleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const sampleKey = chip.dataset.sample;
      loadSampleImage(sampleKey);
      targetBadgeText.textContent = `AMOSTRA: ${PART_PRESETS[sampleKey]?.name.toUpperCase()}`;
    });
  });

  // File Upload
  inputFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      sampleLayer.style.backgroundImage = `url(${event.target.result})`;
      sampleLayer.classList.add('active');
      targetBadgeText.textContent = 'FOTO CARREGADA — PRONTA';
      showToast('Foto carregada com sucesso! Toque em Escanear.');
    };
    reader.readAsDataURL(file);
  });

  // Modal Controls
  btnCloseModal.addEventListener('click', closeResultModal);
  modalBackdrop.addEventListener('click', closeResultModal);
  btnScanAgain.addEventListener('click', closeResultModal);

  // 3D Render Mode Buttons
  document.querySelectorAll('.viewer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateViewerRenderMode(btn.dataset.mode);
    });
  });

  // Order Print Action
  btnOrderPrint.addEventListener('click', () => {
    sfx.playSuccess();
    showToast('✅ Peça despachada com sucesso para a fila de impressão 3D!');
    setTimeout(() => {
      window.location.href = '/#oficina';
    }, 1800);
  });
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  startCamera();
});
