/**
 * ═══════════════════════════════════════════════════════════════
 * ANNAI (案内) — Voice RAG Chat Widget
 * 
 * Self-contained module for the portfolio chat assistant.
 * Features:
 *   - 3D VRM avatar via Three.js + @pixiv/three-vrm
 *   - Glassmorphic chat panel
 *   - Web Speech API: voice input (STT) + natural voice output (TTS)
 *   - Sentence-by-sentence TTS with human breathing pauses
 *   - Female voice selection with dynamic language matching
 *   - Multi-lingual support (follows Annai's response language)
 *
 * Dependencies (loaded via CDN in head):
 *   - three.js (ES module)
 *   - @pixiv/three-vrm
 *   - GLTFLoader from three/addons
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────
  // IMPORTANT: Update this URL after deploying to Vercel
  const API_BASE_URL = 'https://voice-rag-backend.vercel.app';
  const API_ENDPOINT = `${API_BASE_URL}/api/chat`;

  // VRM 3D model path (served by Jekyll)
  const VRM_MODEL_PATH = '/assets/models/Annai.vrm';

  // TTS settings
  const TTS_SENTENCE_PAUSE_MS = 300; // Breathing pause between sentences
  const TTS_RATE = 0.95;
  const TTS_PITCH = 1.05;

  // ─── State ────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let isRecording = false;
  let isSpeaking = false;
  let recognition = null;
  let speechQueue = [];
  let currentUtterance = null;
  let tooltipTimeout = null;
  let tooltipHideTimeout = null;
  let voicesLoaded = false;

  // Three.js / VRM state
  let vrmScene = null;
  let vrmCamera = null;
  let vrmRenderer = null;
  let vrmModel = null;
  let vrmClock = null;
  let vrmAnimId = null;
  let isVrmHovered = false;
  let annaiState = 'awake'; /* 'awake', 'sleeping', 'chatting' */
  let sleepTimer = null;
  const SLEEP_DELAY = 15000; /* 15 seconds */
  let isTransitioningToSleep = false;
  let hasWaved = false; /* Track if she has waved already during this interaction */

  // ─── DOM References ──────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const avatarContainer = () => $('#annai-avatar-container');
  const wakeArrow = () => $('#annai-wake-arrow');
  const tooltip = () => $('#annai-tooltip');
  const chatPanel = () => $('#annai-chat-panel');
  const messagesArea = () => $('#annai-messages');
  const inputField = () => $('#annai-input');
  const sendBtn = () => $('#annai-send-btn');
  const micBtn = () => $('#annai-mic-btn');
  const speakerBtn = () => $('#annai-speaker-btn');
  const closeBtn = () => $('#annai-close-btn');

  // ─── SVG Icons ────────────────────────────────────────────────
  const ICONS = {
    annai: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M5.5 21c0-4.5 2.9-7 6.5-7s6.5 2.5 6.5 7"/>
      <path d="M12 1v2M8.5 2.5l1 1.7M15.5 2.5l-1 1.7"/>
    </svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>`,
    mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`,
    micOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`,
    speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>`,
    speakerOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`,
  };

  // ─── Initialize ───────────────────────────────────────────────
  function init() {
    initAvatar();
    initTooltip();
    initChatPanel();
    initSpeechRecognition();
    preloadVoices();
  }

  // ─── 3D VRM Avatar (Three.js + @pixiv/three-vrm) ─────────────
  function initAvatar() {
    const container = avatarContainer();
    if (!container) return;

    // Click handlers
    container.addEventListener('click', toggleChat);
    if (wakeArrow()) {
      wakeArrow().addEventListener('click', wakeUp);
    }
    
    container.addEventListener('mouseenter', () => { 
      if (annaiState === 'awake') isVrmHovered = true; 
      resetSleepTimer();
    });
    container.addEventListener('mouseleave', () => { 
      // Do not reset hasWaved immediately to prevent continuous waving
      setTimeout(() => { if (!isVrmHovered) hasWaved = false; }, 2000);
      isVrmHovered = false; 
    });

    // Start inactivity timer
    resetSleepTimer();

    // Three.js is loaded via <script type="module"> which runs async.
    // Poll until window.THREE is available (max 5 seconds).
    let attempts = 0;
    const maxAttempts = 50; // 50 × 100ms = 5 seconds

    function tryInit3D() {
      if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
        try {
          initThreeScene(container);
          loadVRMModel();
        } catch (err) {
          console.warn('Annai: 3D init failed, using fallback.', err);
          renderFallbackAvatar(container);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryInit3D, 100);
      } else {
        console.warn('Annai: THREE.js not loaded after 5s, using fallback avatar.');
        renderFallbackAvatar(container);
      }
    }

    tryInit3D();
  }

  function initThreeScene(container) {
    const width = container.clientWidth || 110;
    const height = container.clientHeight || 110;

    // Scene
    vrmScene = new THREE.Scene();

    // Camera — pulled back to frame the FULL body (head to toe)
    vrmCamera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20);
    vrmCamera.position.set(0, 0.8, 3.5);
    vrmCamera.lookAt(0, 0.8, 0);

    // Renderer
    vrmRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    vrmRenderer.setSize(width, height);
    vrmRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    vrmRenderer.outputColorSpace = THREE.SRGBColorSpace;
    vrmRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    vrmRenderer.toneMappingExposure = 1.2;

    const canvas = vrmRenderer.domElement;
    canvas.style.pointerEvents = 'none'; /* Container handles clicks */
    canvas.id = 'annai-vrm-canvas';

    container.innerHTML = '';
    container.appendChild(canvas);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    vrmScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xeeddff, 1.2);
    keyLight.position.set(2, 3, 4);
    vrmScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    fillLight.position.set(-2, 1, 2);
    vrmScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xccaaff, 0.5);
    rimLight.position.set(0, 2, -3);
    vrmScene.add(rimLight);

    // Clock for animations
    vrmClock = new THREE.Clock();

    // Start render loop
    animateVRM();
  }

  function loadVRMModel() {
    // Use the globally available GLTFLoader and VRM classes (from CDN)
    if (typeof THREE.GLTFLoader === 'undefined' && typeof GLTFLoader === 'undefined') {
      console.warn('Annai: GLTFLoader not available.');
      return;
    }

    const loader = new THREE.GLTFLoader();

    // Register VRM loader plugin if available
    if (typeof THREE.VRMLoaderPlugin !== 'undefined') {
      loader.register((parser) => new THREE.VRMLoaderPlugin(parser));
    } else if (typeof VRMLoaderPlugin !== 'undefined') {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }

    loader.load(
      VRM_MODEL_PATH,
      (gltf) => {
        // Check for VRM extension
        const vrm = gltf.userData.vrm;
        if (vrm) {
          vrmModel = vrm;
          
          /* Expose on window for debugging */
          window._annaiVRM = vrm;
          
          vrm.scene.rotation.y = 0; 
          vrmScene.add(vrm.scene);

          /* Apply initial look-at if supported */
          if (vrm.lookAt) {
            vrm.lookAt.target = vrmCamera;
          }
          
          /* Now that the model is loaded, show the tooltip */
          window._annaiVRMReady = true;
          showTooltipAfterLoad();
          
          console.log('Annai: VRM loaded. Humanoid:', !!vrm.humanoid, 'Bones:', vrm.humanoid ? Object.keys(vrm.humanoid.humanBones) : 'N/A');
        } else {
          // Plain GLTF model fallback
          const model = gltf.scene;
          model.rotation.y = Math.PI;
          vrmScene.add(model);

          // Auto-center and scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y = 0;
        }
      },
      undefined, // progress
      (error) => {
        console.warn('Annai: VRM load failed, using fallback.', error);
        if (vrmRenderer) {
          const container = avatarContainer();
          if (container) renderFallbackAvatar(container);
        }
      }
    );
  }

  function animateVRM() {
    vrmAnimId = requestAnimationFrame(animateVRM);

    if (!vrmRenderer || !vrmScene || !vrmCamera) return;

    const delta = vrmClock ? vrmClock.getDelta() : 0.016;
    const elapsed = vrmClock ? vrmClock.getElapsedTime() : 0;

    /* ── Dynamic camera per state ── */
    let camTargetY = 0.8, camTargetZ = 3.5;
    if (annaiState === 'chatting') {
      camTargetY = 0.7;
      camTargetZ = 3.5;
    }
    vrmCamera.position.y = THREE.MathUtils.lerp(vrmCamera.position.y, camTargetY, 0.03);
    vrmCamera.position.z = THREE.MathUtils.lerp(vrmCamera.position.z, camTargetZ, 0.03);
    vrmCamera.lookAt(0, camTargetY, 0);

    /* ── Set NORMALIZED bone rotations BEFORE vrm.update() ── */
    /* VRM 1.0 architecture:
       1. We pose the NORMALIZED rig (standard Y-up coordinate system)
       2. vrm.update() calls humanoid.update() which copies our
          normalized quaternions → raw bone quaternions automatically.
       3. Spring bones etc. then run on top of the result. */
    if (vrmModel && vrmModel.humanoid) {
      const getNorm = (name) => vrmModel.humanoid.getNormalizedBoneNode(name);
      
      const lUA  = getNorm('leftUpperArm');
      const lLA  = getNorm('leftLowerArm');
      const rUA  = getNorm('rightUpperArm');
      const rLA  = getNorm('rightLowerArm');
      const head = getNorm('head');
      const spine = getNorm('spine');
      const hips  = getNorm('hips');
      const lUL  = getNorm('leftUpperLeg');
      const rUL  = getNorm('rightUpperLeg');
      const lLL  = getNorm('leftLowerLeg');
      const rLL  = getNorm('rightLowerLeg');

      /* ── Target pose: natural standing idle (matching ref image 1) ── */
      const t = {
        sceneRotX: 0, sceneRotZ: 0,
        scenePosY: Math.sin(elapsed * 1.5) * 0.005,
        scenePosX: 0,
        /* Arms at sides — VRM rest = T-pose, need ~1.2 rad to bring arms down */
        rUAz: 1.2, rUAx: 0.05, rUAy: 0,
        rLAz: 0, rLAx: -0.05,
        lUAz: -1.2, lUAx: 0.05, lUAy: 0,
        lLAz: 0, lLAx: -0.05,
        /* Gentle idle head sway */
        headX: Math.sin(elapsed * 0.8) * 0.015,
        headY: Math.sin(elapsed * 0.5) * 0.02,
        headZ: 0,
        spineX: 0, spineZ: 0,
        /* Legs straight */
        lULx: 0, lULz: 0, rULx: 0, rULz: 0,
        lLLx: 0, rLLx: 0,
        /* Hips */
        hipsX: 0, hipsZ: 0, hipsPosY: 0
      };

      /* ── State overrides ── */
      if (annaiState === 'chatting') {
        /* Sitting pose (ref image 2) — legs dangling */
        t.lULx = -1.5; t.rULx = -1.5;
        t.lLLx = 1.5; t.rLLx = 1.5;
        /* Arms resting on thighs — still need arm-down rotation */
        t.rUAz = 1.0; t.rUAx = -0.3;
        t.rLAx = -0.4;
        t.lUAz = -1.0; t.lUAx = -0.3;
        t.lLAx = -0.4;
        /* Look slightly forward */
        t.headY = -0.05;
        t.spineX = 0.05;
        t.hipsPosY = -0.15;
      } else if (isVrmHovered && !hasWaved) {
        /* Cute wave with right hand raised (ref image 3) */
        t.rUAz = -0.8; t.rUAx = 0;
        t.rUAy = -0.8;
        t.rLAx = -1.8;
        t.rLAz = Math.sin(elapsed * 8) * 0.2;
        /* Left arm stays at side */
        t.lUAz = -1.2; t.lUAx = 0.05;
        /* Head tilt */
        t.headZ = 0.1; t.headY = 0;
        t.headX = Math.sin(elapsed * 0.5) * 0.03;
        
        if (!window._annaiWaveTimer) {
          window._annaiWaveTimer = setTimeout(() => {
            hasWaved = true;
            window._annaiWaveTimer = null;
          }, 2500);
        }
      }

      /* ── Smooth interpolation (lerp) ── */
      const sp = (annaiState === 'sleeping' || isTransitioningToSleep) ? 0.025 : 0.05;

      /* Scene transforms */
      vrmModel.scene.rotation.x = THREE.MathUtils.lerp(vrmModel.scene.rotation.x, t.sceneRotX, sp);
      vrmModel.scene.rotation.z = THREE.MathUtils.lerp(vrmModel.scene.rotation.z, t.sceneRotZ, sp);
      vrmModel.scene.position.y = THREE.MathUtils.lerp(vrmModel.scene.position.y, t.scenePosY, sp);
      vrmModel.scene.position.x = THREE.MathUtils.lerp(vrmModel.scene.position.x, t.scenePosX, sp);

      /* Right arm */
      if (rUA) {
        rUA.rotation.z = THREE.MathUtils.lerp(rUA.rotation.z, t.rUAz, sp);
        rUA.rotation.x = THREE.MathUtils.lerp(rUA.rotation.x, t.rUAx, sp);
        rUA.rotation.y = THREE.MathUtils.lerp(rUA.rotation.y, t.rUAy, sp);
      }
      if (rLA) {
        rLA.rotation.z = THREE.MathUtils.lerp(rLA.rotation.z, t.rLAz, sp);
        rLA.rotation.x = THREE.MathUtils.lerp(rLA.rotation.x, t.rLAx, sp);
      }

      /* Left arm */
      if (lUA) {
        lUA.rotation.z = THREE.MathUtils.lerp(lUA.rotation.z, t.lUAz, sp);
        lUA.rotation.x = THREE.MathUtils.lerp(lUA.rotation.x, t.lUAx, sp);
        lUA.rotation.y = THREE.MathUtils.lerp(lUA.rotation.y, t.lUAy, sp);
      }
      if (lLA) {
        lLA.rotation.z = THREE.MathUtils.lerp(lLA.rotation.z, t.lLAz, sp);
        lLA.rotation.x = THREE.MathUtils.lerp(lLA.rotation.x, t.lLAx, sp);
      }

      /* Head */
      if (head) {
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, t.headX, sp);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, t.headY, sp);
        head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, t.headZ, sp);
      }

      /* Spine */
      if (spine) {
        spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, t.spineX, sp);
        spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, t.spineZ, sp);
      }

      /* Legs */
      if (lUL) {
        lUL.rotation.x = THREE.MathUtils.lerp(lUL.rotation.x, t.lULx, sp);
        lUL.rotation.z = THREE.MathUtils.lerp(lUL.rotation.z, t.lULz, sp);
      }
      if (rUL) {
        rUL.rotation.x = THREE.MathUtils.lerp(rUL.rotation.x, t.rULx, sp);
        rUL.rotation.z = THREE.MathUtils.lerp(rUL.rotation.z, t.rULz, sp);
      }
      if (lLL) { lLL.rotation.x = THREE.MathUtils.lerp(lLL.rotation.x, t.lLLx, sp); }
      if (rLL) { rLL.rotation.x = THREE.MathUtils.lerp(rLL.rotation.x, t.rLLx, sp); }

      /* Hips position for sitting */
      if (hips) {
        hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, t.hipsX, sp);
        hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, t.hipsZ, sp);
      }
    }

    /* ── NOW call vrm.update() — this copies normalized → raw bones ── */
    if (vrmModel && typeof vrmModel.update === 'function') {
      vrmModel.update(delta);
    }

    vrmRenderer.render(vrmScene, vrmCamera);
  }

  function disposeVRM() {
    if (vrmAnimId) cancelAnimationFrame(vrmAnimId);
    if (vrmRenderer) vrmRenderer.dispose();
    vrmAnimId = null;
  }

  function renderFallbackAvatar(container) {
    // Stop Three.js if it was running
    disposeVRM();
    container.innerHTML = `
      <div class="annai-avatar-fallback">
        ${ICONS.annai}
      </div>
    `;
  }

  // ─── Tooltip ──────────────────────────────────────────────────
  function showTooltipAfterLoad() {
    /* Called when VRM model finishes loading — syncs bubble with avatar */
    const tip = tooltip();
    if (!tip || isOpen) return;
    tip.classList.add('annai-visible');
    tooltipHideTimeout = setTimeout(() => {
      tip.classList.remove('annai-visible');
    }, 5000);
  }

  function initTooltip() {
    const container = avatarContainer();
    const tip = tooltip();
    if (!container || !tip) return;

    /* Do NOT auto-show the tooltip here — we wait for VRM to load.
       showTooltipAfterLoad() is called from the VRM load callback. */

    // Show on hover
    container.addEventListener('mouseenter', () => {
      if (!isOpen) {
        clearTimeout(tooltipHideTimeout);
        tip.classList.add('annai-visible');
      }
    });

    container.addEventListener('mouseleave', () => {
      tooltipHideTimeout = setTimeout(() => {
        tip.classList.remove('annai-visible');
      }, 600);
    });
  }

  // ─── Chat Panel ───────────────────────────────────────────────
  function initChatPanel() {
    // Close button
    const close = closeBtn();
    if (close) close.addEventListener('click', toggleChat);

    // Send button
    const send = sendBtn();
    if (send) send.addEventListener('click', handleSend);

    // Input: Enter to send
    const input = inputField();
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Mic button
    const mic = micBtn();
    if (mic) mic.addEventListener('click', toggleRecording);

    // Speaker toggle button
    const speaker = speakerBtn();
    if (speaker) speaker.addEventListener('click', toggleSpeaker);
  }

  function toggleChat() {
    isOpen = !isOpen;
    const panel = chatPanel();
    const container = avatarContainer();
    const tip = tooltip();

    if (isOpen) {
      annaiState = 'chatting';
      clearTimeout(sleepTimer);
      if (wakeArrow()) wakeArrow().classList.remove('annai-visible');
      
      panel.classList.add('annai-open');
      container.classList.remove('annai-sleeping');
      container.classList.add('annai-integrated');
      tip.classList.remove('annai-visible');
      clearTimeout(tooltipTimeout);
      clearTimeout(tooltipHideTimeout);

      // Focus input
      setTimeout(() => {
        const input = inputField();
        if (input) input.focus();
      }, 400);
    } else {
      annaiState = 'awake';
      panel.classList.remove('annai-open');
      container.classList.remove('annai-integrated');
      resetSleepTimer();
      stopSpeaking();
    }
  }

  // ─── Lifecycle Methods ─────────────────────────────────────────
  function resetSleepTimer() {
    clearTimeout(sleepTimer);
    if (annaiState !== 'chatting') {
      sleepTimer = setTimeout(goToSleep, SLEEP_DELAY);
    }
  }

  function goToSleep() {
    if (annaiState === 'chatting' || isTransitioningToSleep) return;
    
    annaiState = 'sleeping';
    const tip = tooltip();
    if (tip) tip.classList.remove('annai-visible');
    
    /* Just fade out while standing — no lie-down animation */
    const container = avatarContainer();
    if (container) container.classList.add('annai-sleeping');
    if (wakeArrow()) wakeArrow().classList.add('annai-visible');
  }

  function wakeUp() {
    isTransitioningToSleep = false;
    hasWaved = false; // Reset wave state on wake
    
    // Step 1: Reappear immediately while still in the sleeping pose on the floor
    const container = avatarContainer();
    if (container) container.classList.remove('annai-sleeping');
    if (wakeArrow()) wakeArrow().classList.remove('annai-visible');
    
    // Step 2: Change state to awake so she smoothly stands up
    annaiState = 'awake';
    
    // Step 3: Trigger wave *after* she stands up (increased delay for smoother cinematic feel)
    setTimeout(() => { 
      isVrmHovered = true; 
    }, 1200); 
    
    resetSleepTimer();
  }

  // ─── Message Handling ─────────────────────────────────────────
  function handleSend() {
    const input = inputField();
    if (!input || isLoading) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    sendMessage(text);
  }

  async function sendMessage(text) {
    if (isLoading) return;

    // Remove welcome message if present
    const welcome = $('.annai-welcome');
    if (welcome) welcome.remove();

    // Add user message
    appendMessage('user', text);

    // Show typing indicator
    isLoading = true;
    updateSendButton();
    const typingEl = showTypingIndicator();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Remove typing indicator
      if (typingEl) typingEl.remove();

      // Add bot message
      appendMessage('bot', data.answer, data.sources);

      // Auto-speak the response
      if (data.answer) {
        speakResponse(data.answer, data.detectedLang || 'en-US');
      }
    } catch (error) {
      console.error('Annai chat error:', error);
      if (typingEl) typingEl.remove();
      appendError('Sorry, I couldn\'t connect. Please check your network and try again.');
    } finally {
      isLoading = false;
      updateSendButton();
    }
  }

  function appendMessage(role, text, sources) {
    const messages = messagesArea();
    if (!messages) return;

    const msg = document.createElement('div');
    msg.className = `annai-msg annai-msg--${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'annai-msg__bubble';
    bubble.textContent = text;
    msg.appendChild(bubble);

    // Add source chips for bot messages
    if (role === 'bot' && sources && sources.length > 0) {
      const sourcesEl = document.createElement('div');
      sourcesEl.className = 'annai-sources';

      for (const source of sources) {
        const chip = document.createElement('a');
        chip.className = 'annai-source-chip';
        chip.href = source.url;
        chip.target = '_blank';
        chip.rel = 'noopener noreferrer';
        chip.innerHTML = `${ICONS.github} ${escapeHtml(source.name)}`;
        sourcesEl.appendChild(chip);
      }
      msg.appendChild(sourcesEl);
    }

    messages.appendChild(msg);
    scrollToBottom();
  }

  function appendError(text) {
    const messages = messagesArea();
    if (!messages) return;

    const errorEl = document.createElement('div');
    errorEl.className = 'annai-error';
    errorEl.textContent = text;
    messages.appendChild(errorEl);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const messages = messagesArea();
    if (!messages) return null;

    const typing = document.createElement('div');
    typing.className = 'annai-typing';
    typing.id = 'annai-typing-indicator';
    typing.innerHTML = `
      <div class="annai-typing__dot"></div>
      <div class="annai-typing__dot"></div>
      <div class="annai-typing__dot"></div>
    `;
    messages.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function scrollToBottom() {
    const messages = messagesArea();
    if (messages) {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    }
  }

  function updateSendButton() {
    const btn = sendBtn();
    if (btn) btn.disabled = isLoading;
  }

  // ─── Speech Recognition (STT) ────────────────────────────────
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Hide mic button if not supported
      const mic = micBtn();
      if (mic) mic.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const input = inputField();
      if (input) {
        input.value = finalTranscript || interimTranscript;
      }

      // Auto-send on final result
      if (finalTranscript) {
        stopRecording();
        setTimeout(() => sendMessage(finalTranscript.trim()), 200);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function startRecording() {
    if (!recognition || isRecording) return;

    // Stop any ongoing speech
    stopSpeaking();

    isRecording = true;
    const mic = micBtn();
    if (mic) {
      mic.classList.add('annai-recording');
      mic.innerHTML = ICONS.micOff;
    }

    try {
      recognition.start();
    } catch (e) {
      // Already started
      stopRecording();
    }
  }

  function stopRecording() {
    isRecording = false;
    const mic = micBtn();
    if (mic) {
      mic.classList.remove('annai-recording');
      mic.innerHTML = ICONS.mic;
    }

    if (recognition) {
      try { recognition.stop(); } catch (e) { /* ignore */ }
    }
  }

  // ─── Text-to-Speech (TTS) — Human Pacing Engine ──────────────

  /**
   * Preload browser voices (they load asynchronously in many browsers).
   */
  function preloadVoices() {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voicesLoaded = true;
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  /**
   * Select the best female voice for the given language code.
   * Priority: exact lang + female → lang family + female → any female → default
   */
  function selectFemaleVoice(langCode) {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const langPrefix = langCode.split('-')[0].toLowerCase(); // e.g., "en" from "en-US"

    // Known female voice name patterns (case-insensitive)
    const femalePatterns = [
      'female', 'woman', 'girl',
      // Common specific female voice names
      'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'veena',
      'kyoko', 'o-ren', 'mei-jia', 'sin-ji',
      'lekha', 'rishi', // some Hindi voices
      'google.*female',
      'zira', 'hazel', 'susan', 'linda',
      // Google TTS female voices
      'google uk english female', 'google us english',
    ];

    function isFemaleVoice(voice) {
      const name = voice.name.toLowerCase();
      return femalePatterns.some((pattern) => {
        if (pattern.includes('*')) {
          return new RegExp(pattern).test(name);
        }
        return name.includes(pattern);
      });
    }

    function matchesLang(voice, exactCode, prefix) {
      const voiceLang = voice.lang.toLowerCase();
      if (voiceLang === exactCode.toLowerCase()) return 'exact';
      if (voiceLang.startsWith(prefix)) return 'prefix';
      return null;
    }

    // Tier 1: Exact language + female
    let match = voices.find(
      (v) => matchesLang(v, langCode, langPrefix) === 'exact' && isFemaleVoice(v)
    );
    if (match) return match;

    // Tier 2: Language prefix + female
    match = voices.find(
      (v) => matchesLang(v, langCode, langPrefix) === 'prefix' && isFemaleVoice(v)
    );
    if (match) return match;

    // Tier 3: Exact language, any gender
    match = voices.find(
      (v) => matchesLang(v, langCode, langPrefix) === 'exact'
    );
    if (match) return match;

    // Tier 4: Language prefix, any gender
    match = voices.find(
      (v) => matchesLang(v, langCode, langPrefix) === 'prefix'
    );
    if (match) return match;

    // Tier 5: Any female voice (English fallback)
    match = voices.find((v) => isFemaleVoice(v));
    if (match) return match;

    // Tier 6: Default
    return voices[0] || null;
  }

  /**
   * Split text into sentences for natural pacing.
   * Splits on sentence-ending punctuation across multiple languages:
   *   English: . ? !
   *   Hindi: । (purna viram)
   *   Japanese: 。？！
   *   Chinese: 。？！
   */
  function splitIntoSentences(text) {
    // Split on sentence-ending punctuation, keeping the delimiter
    const parts = text.split(/(?<=[.?!।。？！])\s*/);
    return parts
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Speak the response using sentence-by-sentence queuing with
   * 300ms breathing pauses between sentences.
   */
  function speakResponse(text, langCode) {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    stopSpeaking();

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return;

    isSpeaking = true;
    updateSpeakerButton();
    speechQueue = [...sentences];

    speakNextSentence(langCode);
  }

  function speakNextSentence(langCode) {
    if (speechQueue.length === 0 || !isSpeaking) {
      isSpeaking = false;
      updateSpeakerButton();
      return;
    }

    const sentence = speechQueue.shift();
    const utterance = new SpeechSynthesisUtterance(sentence);
    currentUtterance = utterance;

    // Set voice
    const voice = selectFemaleVoice(langCode);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = langCode;
    }

    utterance.rate = TTS_RATE;
    utterance.pitch = TTS_PITCH;

    utterance.onend = () => {
      if (speechQueue.length > 0 && isSpeaking) {
        // Human breathing pause before next sentence
        setTimeout(() => speakNextSentence(langCode), TTS_SENTENCE_PAUSE_MS);
      } else {
        isSpeaking = false;
        updateSpeakerButton();
      }
    };

    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      // Try next sentence anyway
      if (speechQueue.length > 0 && isSpeaking) {
        setTimeout(() => speakNextSentence(langCode), TTS_SENTENCE_PAUSE_MS);
      } else {
        isSpeaking = false;
        updateSpeakerButton();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    isSpeaking = false;
    speechQueue = [];
    currentUtterance = null;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    updateSpeakerButton();
  }

  function toggleSpeaker() {
    if (isSpeaking) {
      stopSpeaking();
    }
    // If not speaking, there's nothing to toggle — the next response will auto-speak
  }

  function updateSpeakerButton() {
    const speaker = speakerBtn();
    if (!speaker) return;

    if (isSpeaking) {
      speaker.classList.add('annai-speaking');
      speaker.innerHTML = ICONS.speakerOff;
      speaker.title = 'Stop speaking';
    } else {
      speaker.classList.remove('annai-speaking');
      speaker.innerHTML = ICONS.speaker;
      speaker.title = 'Speaker';
    }
  }

  // ─── Utilities ────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Boot ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
