/* ─────────────────────────────────────────
   HOME'S PLACE · app.js
   Lenis + GSAP scroll-driven canvas animation
   ───────────────────────────────────────── */

(function () {
  "use strict";

  /* ── CONFIG ── */
  const FRAME_COUNT   = 251;
  const FRAME_EXT     = "webp";
  const FRAME_DIR     = "frames";
  const IMAGE_SCALE   = 0.88;   /* padded-cover scale — shows thin bg border */
  const FRAME_SPEED   = 1.1;    /* video runs 10% faster than scroll — frames lead sections */
  const SCROLL_HEIGHT = 700;    /* must match CSS height: 700vh */
  const FIRST_BATCH   = 12;     /* frames to load before revealing page */

  /* ── DOM REFS ── */
  const loader       = document.getElementById("loader");
  const loaderBar    = document.getElementById("loader-bar");
  const loaderPct    = document.getElementById("loader-percent");
  const hero         = document.getElementById("hero");
  const canvasWrap   = document.getElementById("canvas-wrap");
  const canvas       = document.getElementById("canvas");
  const ctx          = canvas.getContext("2d");
  const darkOverlay  = document.getElementById("dark-overlay");
  const marqueeWrap  = document.getElementById("marquee");
  const scrollCont   = document.getElementById("scroll-container");
  const sections     = [...document.querySelectorAll(".scroll-section")];

  /* ── STATE ── */
  const frames   = new Array(FRAME_COUNT).fill(null);
  let loaded     = 0;
  let currentFrame = 0;
  let bgColor    = "#0d0c0b";
  let dpr        = Math.min(window.devicePixelRatio || 1, 2);

  /* ────────────────────────────────────────
     1 · CANVAS RESIZE
  ──────────────────────────────────────── */
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    drawFrame(currentFrame);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ────────────────────────────────────────
     2 · DRAW FRAME (padded cover)
  ──────────────────────────────────────── */
  function sampleBgColor(img) {
    try {
      const tmp  = document.createElement("canvas");
      tmp.width  = 4;
      tmp.height = 4;
      const tc   = tmp.getContext("2d");
      tc.drawImage(img, 0, 0, 4, 4);
      const px   = tc.getImageData(0, 0, 1, 1).data;
      bgColor    = `rgb(${px[0]},${px[1]},${px[2]})`;
    } catch (_) {}
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;

    const cw = canvas.width  / dpr;
    const ch = canvas.height / dpr;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ────────────────────────────────────────
     3 · FRAME PRELOADER
  ──────────────────────────────────────── */
  function loadFrame(index, onDone) {
    const img = new Image();
    img.onload = () => {
      frames[index] = img;
      loaded++;
      if (index % 20 === 0) sampleBgColor(img);
      if (onDone) onDone(index);
    };
    img.onerror = () => {
      loaded++;
      if (onDone) onDone(index);
    };
    img.src = `${FRAME_DIR}/frame_${String(index + 1).padStart(4, "0")}.${FRAME_EXT}`;
  }

  function updateLoaderUI(count) {
    const pct = Math.round((count / FRAME_COUNT) * 100);
    loaderBar.style.width = pct + "%";
    loaderPct.textContent = pct + "%";
  }

  function preload() {
    /* Phase 1: first FIRST_BATCH frames → fast first paint */
    let phase1Done = 0;
    for (let i = 0; i < FIRST_BATCH; i++) {
      loadFrame(i, () => {
        updateLoaderUI(loaded);
        phase1Done++;
        if (phase1Done === FIRST_BATCH) {
          drawFrame(0);
          loadRemaining();
        }
      });
    }

    /* Phase 2: rest in background while showing loader */
    function loadRemaining() {
      let remainDone = 0;
      const total = FRAME_COUNT - FIRST_BATCH;
      for (let i = FIRST_BATCH; i < FRAME_COUNT; i++) {
        loadFrame(i, () => {
          updateLoaderUI(loaded);
          remainDone++;
          if (remainDone === total) revealPage();
        });
      }
    }
  }

  function revealPage() {
    loader.classList.add("hidden");
    hero.style.opacity = "1";
    const words = hero.querySelectorAll(".word");
    gsap.from(words, {
      y: "110%", opacity: 0, duration: 1.1, stagger: 0.12, ease: "power4.out", delay: 0.2
    });
    gsap.from(hero.querySelector(".hero-tagline"), {
      y: 20, opacity: 0, duration: 1, ease: "power3.out", delay: 0.6
    });
    gsap.from(hero.querySelector(".hero-description"), {
      y: 15, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.85
    });
    gsap.from(hero.querySelector(".scroll-indicator"), {
      opacity: 0, duration: 1, delay: 1.2
    });
    gsap.from(hero.querySelector(".hero-label"), {
      opacity: 0, y: -10, duration: 0.8, delay: 0.4
    });
  }

  /* ────────────────────────────────────────
     4 · LENIS SMOOTH SCROLL
  ──────────────────────────────────────── */
  const isTouchDevice = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

  function initLenis() {
    if (isTouchDevice) {
      /* On touch devices, native scroll drives ScrollTrigger — no Lenis needed */
      ScrollTrigger.normalizeScroll(true);
      return;
    }
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ────────────────────────────────────────
     6 · FRAME-TO-SCROLL BINDING
  ──────────────────────────────────────── */
  function initFrameBinding() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;

        /* Sections 1–3 (scroll 13 %–49 %) run 10 % faster than the global speed */
        const S1 = 0.23, S3 = 0.59;
        const boost = FRAME_SPEED * 1.15;  /* 1.265 — 15 % faster than base in S1–S3 */
        let accelerated;
        if (p <= S1) {
          accelerated = p * FRAME_SPEED;
        } else if (p <= S3) {
          const atS1 = S1 * FRAME_SPEED;
          accelerated = atS1 + (p - S1) * boost;
        } else {
          const atS1 = S1 * FRAME_SPEED;
          const atS3 = atS1 + (S3 - S1) * boost;
          accelerated = atS3 + (p - S3) * FRAME_SPEED;
        }
        accelerated = Math.min(accelerated, 1);

        const index = Math.min(
          Math.floor(accelerated * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      }
    });
  }

  /* ────────────────────────────────────────
     7 · SECTION POSITION + ANIMATION
  ──────────────────────────────────────── */
  function positionSections() {
    sections.forEach((section) => {
      if (section.dataset.fixed === "true") return;
      const enter = parseFloat(section.dataset.enter) / 100;
      const leave  = parseFloat(section.dataset.leave) / 100;
      const mid    = (enter + leave) / 2;
      section.style.top            = (mid * SCROLL_HEIGHT) + "vh";
      section.style.transform      = "translateY(-50%)";
      section.style.willChange     = "opacity, transform";
    });
  }

  function buildSectionTimeline(section) {
    const type = section.dataset.animation;
    const children = [
      ...section.querySelectorAll(
        ".section-label, .section-heading, .section-body, .section-note, .cta-button, .stat, .hotspot-item"
      )
    ];

    const tl = gsap.timeline({ paused: true });

    switch (type) {
      case "slide-left":
        tl.from(children, {
          x: -80, opacity: 0, stagger: 0.13, duration: 0.95, ease: "power3.out"
        });
        break;

      case "slide-right":
        tl.from(children, {
          x: 80, opacity: 0, stagger: 0.13, duration: 0.95, ease: "power3.out"
        });
        break;

      case "rotate-in":
        tl.from(children, {
          y: 40, rotation: 2.5, opacity: 0, stagger: 0.11, duration: 0.9, ease: "power3.out"
        });
        break;

      case "stagger-up":
        tl.from(children, {
          y: 55, opacity: 0, stagger: 0.16, duration: 0.85, ease: "power3.out"
        });
        break;

      case "clip-reveal":
        tl.from(children, {
          clipPath: "inset(100% 0 0 0)",
          opacity: 0,
          stagger: 0.14,
          duration: 1.15,
          ease: "power4.inOut"
        });
        break;

      case "none":
        /* hero entrance handled by revealPage() */
        break;

      default: /* fade-up */
        tl.from(children, {
          y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out"
        });
    }

    return tl;
  }

  function initSectionAnimations() {
    sections.forEach((section) => {
      const enter  = parseFloat(section.dataset.enter) / 100;
      const leave  = parseFloat(section.dataset.leave) / 100;
      const persist = section.dataset.persist === "true";
      const tl     = buildSectionTimeline(section);

      let isVisible = false;

      ScrollTrigger.create({
        trigger: scrollCont,
        start: "top top",
        end: "bottom bottom",
        scrub: false,
        onUpdate: (self) => {
          const p = self.progress;
          const fadeRange = 0.025;

          /* --- Fade IN section opacity --- */
          let opacity = 0;
          if (p >= enter - fadeRange && p <= enter) {
            opacity = (p - (enter - fadeRange)) / fadeRange;
          } else if (p > enter && (p < leave || persist)) {
            opacity = 1;
          } else if (!persist && p >= leave && p <= leave + fadeRange) {
            opacity = 1 - (p - leave) / fadeRange;
          } else if (!persist && p > leave + fadeRange) {
            opacity = 0;
          }
          section.style.opacity = opacity;

          /* --- Play / reverse entrance animation --- */
          const active = p >= enter - 0.005 && (persist || p <= leave + 0.005);
          if (active && !isVisible) {
            isVisible = true;
            section.classList.add("visible");
            tl.play();
          } else if (!active && isVisible && !persist) {
            isVisible = false;
            section.classList.remove("visible");
            tl.reverse();
          }
        }
      });
    });
  }

  /* ────────────────────────────────────────
     8 · DARK OVERLAY (for stats section)
  ──────────────────────────────────────── */
  function initDarkOverlay() {
    /* Stats section: data-enter="75" data-leave="85" */
    const enter = 0.74;
    const leave  = 0.85;
    const fade  = 0.018;

    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p >= enter - fade && p < enter) {
          opacity = (p - (enter - fade)) / fade;
        } else if (p >= enter && p < leave) {
          opacity = 0.91;
        } else if (p >= leave && p <= leave + fade) {
          opacity = 0.91 * (1 - (p - leave) / fade);
        }
        darkOverlay.style.opacity = opacity;
      }
    });
  }

  /* ────────────────────────────────────────
     9 · STATS COUNTER ANIMATIONS
  ──────────────────────────────────────── */
  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target   = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || "0");

      gsap.fromTo(
        el,
        { textContent: 0 },
        {
          textContent: target,
          duration: 2.2,
          ease: "power1.out",
          snap: { textContent: decimals === 0 ? 1 : 0.1 },
          scrollTrigger: {
            trigger: el.closest(".scroll-section"),
            containerAnimation: null,
            start: "top 80%",
            toggleActions: "play none none reverse",
            onEnter: () => {
              /* stats section already handled by dark overlay timing */
            }
          }
        }
      );
    });
  }

  /* ────────────────────────────────────────
     10 · MARQUEE
  ──────────────────────────────────────── */
  function initMarquee() {
    const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -28;
    const text  = marqueeWrap.querySelector(".marquee-text");

    /* Fade marquee in around Feature 2 section, out before CTA */
    const mEnter = 0.24;
    const mLeave  = 0.86;
    const mFade  = 0.04;

    gsap.to(text, {
      xPercent: speed,
      ease: "none",
      scrollTrigger: {
        trigger: scrollCont,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });

    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;
        if (p >= mEnter - mFade && p < mEnter) {
          opacity = (p - (mEnter - mFade)) / mFade;
        } else if (p >= mEnter && p < mLeave) {
          opacity = 1;
        } else if (p >= mLeave && p <= mLeave + mFade) {
          opacity = 1 - (p - mLeave) / mFade;
        }
        marqueeWrap.style.opacity = opacity;
      }
    });
  }

  /* ────────────────────────────────────────
     INIT
  ──────────────────────────────────────── */
  function init() {
    gsap.registerPlugin(ScrollTrigger);

    positionSections();
    initLenis();
    initFrameBinding();
    initSectionAnimations();
    initDarkOverlay();
    initCounters();
    initMarquee();

    preload();
  }

  init();

})();
