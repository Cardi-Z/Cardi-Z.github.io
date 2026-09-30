(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealItems = [...document.querySelectorAll(".reveal")];
  revealItems.forEach((el, index) => {
    el.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
  });

  if (prefersReducedMotion) {
    revealItems.forEach((el) => el.classList.add("visible"));
  } else if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach((el) => revealObserver.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("visible"));
  }

  const navLinks = [...document.querySelectorAll("nav a[href^='#']")];
  const sectionMap = navLinks
    .map((link) => {
      const id = decodeURIComponent(link.getAttribute("href").slice(1));
      return [link, document.getElementById(id)];
    })
    .filter(([, section]) => section);

  if (sectionMap.length) {
    const setActive = (id) => {
      sectionMap.forEach(([link, section]) => {
        if (section.id === id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };
    let ticking = false;
    const updateActive = () => {
      const headerOffset = document.querySelector("header")?.offsetHeight || 0;
      const marker = window.scrollY + headerOffset + window.innerHeight * 0.18;
      const current = sectionMap.reduce((active, item) => {
        const [, section] = item;
        return section.offsetTop <= marker ? item : active;
      }, sectionMap[0]);
      setActive(current[1].id);
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActive);
    }, { passive: true });
    window.addEventListener("resize", updateActive);
    updateActive();
  }

  const heroVideo = document.querySelector(".water-hero video");
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.controls = false;
    heroVideo.disablePictureInPicture = true;
    const playHeroVideo = () => {
      const playAttempt = heroVideo.play();
      playAttempt?.catch?.(() => {});
    };
    if (heroVideo.readyState >= 2) playHeroVideo();
    else heroVideo.addEventListener("canplay", playHeroVideo, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && heroVideo.paused) playHeroVideo();
    });
  }

  const workItems = [...document.querySelectorAll(".work-item[data-work-index]")];
  const workVisuals = [...document.querySelectorAll(".work-visual[data-work-visual]")];
  if (workItems.length && workVisuals.length) {
    const setWorkActive = (index) => {
      const activeIndex = Number(index);
      workItems.forEach((item) => item.classList.toggle("is-active", Number(item.dataset.workIndex) === activeIndex));
      workVisuals.forEach((visual) => {
        const visualIndex = Number(visual.dataset.workVisual);
        visual.classList.toggle("is-active", visualIndex === activeIndex);
      });
    };

    let workTicking = false;
    const updateWork = () => {
      const stage = document.querySelector(".work-stage");
      if (!stage) return;
      const visualRect = workVisuals[0].getBoundingClientRect();
      const visualHeight = visualRect.height;
      const marker = window.innerHeight * 0.5;
      const active = workItems.reduce((closest, item) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - marker);
        return distance < closest.distance ? { item, distance } : closest;
      }, { item: workItems[0], distance: Infinity }).item;
      const activeIndex = Number(active.dataset.workIndex);

      workVisuals.forEach((visual, index) => {
        visual.style.zIndex = String(index + 1);
        if (index <= activeIndex) {
          visual.style.clipPath = "inset(0 0 0 0)";
          return;
        }
        const boundary = workItems[index].getBoundingClientRect().top;
        const clippedTop = Math.max(0, Math.min(visualHeight, boundary - visualRect.top));
        visual.style.clipPath = `inset(${clippedTop}px 0 0 0)`;
      });

      setWorkActive(active.dataset.workIndex);
      workTicking = false;
    };

    window.addEventListener("scroll", () => {
      if (workTicking) return;
      workTicking = true;
      requestAnimationFrame(updateWork);
    }, { passive: true });
    window.addEventListener("resize", updateWork);
    updateWork();

    document.querySelectorAll(".work-item a[href$='.html']").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
        const item = link.closest(".work-item");
        const visual = document.querySelector(`.work-visual[data-work-visual="${item?.dataset.workIndex}"]`);
        if (!visual || prefersReducedMotion) return;
        event.preventDefault();
        const rect = visual.getBoundingClientRect();
        const wipe = document.createElement("div");
        wipe.className = "page-wipe";
        wipe.style.top = `${rect.top}px`;
        wipe.style.left = `${rect.left}px`;
        wipe.style.width = `${rect.width}px`;
        wipe.style.height = `${rect.height}px`;
        wipe.appendChild(visual.firstElementChild.cloneNode(true));
        document.body.appendChild(wipe);
        sessionStorage.setItem("portfolioTransitionTitle", link.textContent.replace("↗", "").trim());
        requestAnimationFrame(() => wipe.classList.add("is-opening"));
        setTimeout(() => { window.location.href = link.href; }, 620);
      });
    });
  }

  const incomingTitle = sessionStorage.getItem("portfolioTransitionTitle");
  if (incomingTitle && !document.querySelector(".work-showcase") && !prefersReducedMotion) {
    sessionStorage.removeItem("portfolioTransitionTitle");
    const curtain = document.createElement("div");
    curtain.className = "page-enter-curtain";
    curtain.textContent = incomingTitle;
    document.body.appendChild(curtain);
    curtain.addEventListener("animationend", () => curtain.remove(), { once: true });
    setTimeout(() => curtain.remove(), 900);
  }

  const lightboxTargets = [
    ...document.querySelectorAll(".artifact img, .image-frame img, .hero-media img, .campaign-media video, .demo-media video")
  ].filter((node) => !node.closest("a.project-visual"));

  if (!lightboxTargets.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "media-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "查看媒体");
  lightbox.innerHTML = '<div class="media-lightbox__frame"><button class="media-lightbox__close" type="button" aria-label="关闭">×</button><div class="media-lightbox__content"></div><div class="media-lightbox__caption"></div></div>';
  document.body.appendChild(lightbox);

  const content = lightbox.querySelector(".media-lightbox__content");
  const caption = lightbox.querySelector(".media-lightbox__caption");
  const closeButton = lightbox.querySelector(".media-lightbox__close");
  let previousFocus = null;

  const getCaption = (node) => {
    const figure = node.closest("figure");
    return figure?.dataset.caption || figure?.querySelector("figcaption")?.textContent?.trim() || node.getAttribute("alt") || "";
  };

  const close = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    content.innerHTML = "";
    previousFocus?.focus?.();
  };

  const open = (node) => {
    previousFocus = document.activeElement;
    content.innerHTML = "";
    const media = node.tagName === "VIDEO" ? document.createElement("video") : document.createElement("img");
    if (node.tagName === "VIDEO") {
      const source = node.querySelector("source");
      media.controls = true;
      media.playsInline = true;
      media.poster = node.poster || "";
      media.src = source?.src || node.currentSrc || node.src;
    } else {
      media.src = node.currentSrc || node.src;
      media.alt = node.alt || "";
    }
    content.appendChild(media);
    caption.textContent = getCaption(node);
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    closeButton.focus();
  };

  lightboxTargets.forEach((node) => {
    const wrapper = node.closest(".artifact,.image-frame,.hero-media,.campaign-media,.demo-media") || node.parentElement;
    wrapper?.setAttribute("data-lightbox-ready", "");
    node.addEventListener("click", (event) => {
      if (node.closest("a")) return;
      event.preventDefault();
      open(node);
    });
  });

  closeButton.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) close();
  });
})();
