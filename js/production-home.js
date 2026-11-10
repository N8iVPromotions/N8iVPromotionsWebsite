// Scroll-scrub runtime adapted from the existing N8iV homepage.
const clamp = (value        , min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value        ) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

const lingerEase = (value        , amount        ) => {
  const x = clamp(value);
  const linger = clamp(amount, 0, 0.6);
  const centered = x - 0.5;
  return (1 - linger) * x + linger * (4 * centered ** 3 + 0.5);
};

function buildSegments(
  scenes                    ,
  connectors                                 
)            {
  const result            = [];

  for (const [index, scene] of scenes.entries()) {
    if (scene.mobileClip && !scene.mobilePoster) {
      throw new Error(`Scene ${scene.id} needs mobilePoster for mobileClip`);
    }
    result.push({
      clip: scene.clip,
      key: `scene:${scene.id}`,
      kind: "scene",
      linger: scene.linger ?? 0,
      mobileClip: scene.mobileClip,
      mobilePoster: scene.mobilePoster,
      mobileObjectPosition:
        scene.mobileObjectPosition ?? scene.objectPosition ?? "50% 50%",
      nextSectionIndex: index,
      objectPosition: scene.objectPosition ?? "50% 50%",
      poster: scene.poster,
      scene,
      sectionIndex: index,
      weight: scene.scroll ?? 1.4,
    });

    const connector = connectors[index];
    if (index < scenes.length - 1 && connector?.clip) {
      if (connector.mobileClip && !connector.mobilePoster) {
        throw new Error(
          `Connector after ${scene.id} needs mobilePoster for mobileClip`
        );
      }
      const nextScene = scenes[index + 1];
      result.push({
        clip: connector.clip,
        key: `connector:${scene.id}:${nextScene.id}`,
        kind: "connector",
        linger: 0,
        mobileClip: connector.mobileClip,
        mobilePoster: connector.mobilePoster,
        mobileObjectPosition:
          nextScene.mobileObjectPosition ??
          nextScene.objectPosition ??
          "50% 50%",
        nextSectionIndex: index + 1,
        objectPosition: nextScene.objectPosition ?? "50% 50%",
        poster: connector.poster,
        sectionIndex: index,
        weight: connector.scroll ?? 0.8,
      });
    }
  }

  return result;
}


const SCENES=[{"id": "clarity", "label": "Clarity", "title": "Clarity for every marketing dollar.", "body": "", "clip": "/assets/world/scene-01.mp4", "poster": "/assets/world/scene-01-poster.png", "mobileClip": "/assets/world/scene-01-mobile.mp4", "mobilePoster": "/assets/world/scene-01-mobile-poster.png", "scroll": 3.3, "linger": 0.16, "objectPosition": "50% 56%", "mobileObjectPosition": "50% 50%"}];
function initializeScrollScrub(root                    ) {
const segments=buildSegments(SCENES,[]);
const controllerRef={current:null};
const onActiveRef={current:undefined};
const setActiveSection=(active       )=>root?.querySelectorAll(".scroll-scrub__route-button").forEach((button,index)=>{if(index===active)button.setAttribute("aria-current","step");else button.removeAttribute("aria-current");});
    if (!root || segments.length === 0) {
      return;
    }

    const layerNodes = [
      ...root.querySelectorAll             ("[data-scroll-scrub-layer]"),
    ];
    const bandNodes = [
      ...root.querySelectorAll             ("[data-scroll-scrub-band]"),
    ];
    if (
      layerNodes.length !== segments.length ||
      bandNodes.length !== segments.length
    ) {
      throw new Error("ScrollScrub segment markup is out of sync");
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarsePointer = window.matchMedia(
      "(hover: none) and (pointer: coarse)"
    ).matches;
    const smallViewport = window.matchMedia("(max-width: 860px)");
    const isMobile = () => coarsePointer || smallViewport.matches;
    const sourceFor = (segment                ) =>
      isMobile() && segment.mobileClip ? segment.mobileClip : segment.clip;
    const runtime                   = segments.map((segment, index) => ({
      ...segment,
      band: bandNodes[index],
      current: 0,
      end: 0,
      failed: false,
      layer: layerNodes[index],
      loading: false,
      ready: false,
      start: 0,
      target: 0,
      visible: index === 0,
    }));

    let active = -1;
    let destroyed = false;
    let dirty = true;
    let frame = 0;
    let rootTop = 0;
    let total = 1;
    let viewportHeight = window.innerHeight;
    let layoutWidth = window.innerWidth;
    let userReady = false;

    const unloadClip = (segment                ) => {
      segment.abort?.abort();
      segment.video?.remove();
      if (segment.objectUrl) {
        URL.revokeObjectURL(segment.objectUrl);
      }
      delete segment.abort;
      delete segment.video;
      delete segment.objectUrl;
      delete segment.loadedSource;
      segment.loading = false;
      segment.ready = false;
      segment.failed = false;
      segment.current = segment.target;
      delete segment.layer.dataset.videoPainted;
      delete segment.layer.dataset.videoFailed;
    };

    const layout = () => {
      const pageY = window.scrollY || window.pageYOffset;
      rootTop = root.getBoundingClientRect().top + pageY;
      viewportHeight = window.innerHeight;
      layoutWidth = window.innerWidth;

      for (const segment of runtime) {
        if (
          segment.loadedSource &&
          segment.loadedSource !== sourceFor(segment)
        ) {
          unloadClip(segment);
        }
        const rect = segment.band.getBoundingClientRect();
        segment.start = rect.top + pageY - rootTop;
        segment.end = segment.start + rect.height;
      }
      total = Math.max(runtime.at(-1)?.end ?? viewportHeight, viewportHeight);
      dirty = true;
    };

    const primeVideo = async (video                   ) => {
      if (!video || !isMobile()) {
        return;
      }
      try {
        await video.play();
        video.pause();
      } catch {
        // Keep the poster; a later user gesture/seek can retry naturally.
      }
    };

    const loadClip = async (segment                ) => {
      const source = sourceFor(segment);
      if (
        reduceMotion ||
        destroyed ||
        segment.loading ||
        segment.ready ||
        segment.failed ||
        !source
      ) {
        return;
      }

      segment.loading = true;
      segment.loadedSource = source;
      segment.abort = new AbortController();
      const request = segment.abort;

      try {
        const response = await fetch(source, {
          signal: request.signal,
        });
        if (!response.ok) {
          throw new Error(`Clip failed: ${response.status}`);
        }
        const blob = await response.blob();
        if (
          destroyed ||
          request.signal.aborted ||
          segment.loadedSource !== source
        ) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const video = document.createElement("video");
        video.className = "scroll-scrub__video";
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.src = objectUrl;

        video.addEventListener(
          "loadedmetadata",
          () => {
            if (segment.video !== video || segment.loadedSource !== source) {
              return;
            }
            segment.ready = true;
            segment.loading = false;
            dirty = true;
          },
          { once: true }
        );
        video.addEventListener(
          "loadeddata",
          () => {
            if (
              userReady &&
              segment.video === video &&
              segment.loadedSource === source
            ) {
              void primeVideo(video);
            }
          },
          { once: true }
        );
        video.addEventListener(
          "error",
          () => {
            if (segment.video !== video) {
              return;
            }
            video.remove();
            URL.revokeObjectURL(objectUrl);
            delete segment.video;
            delete segment.objectUrl;
            segment.failed = true;
            segment.loading = false;
            segment.ready = false;
            delete segment.layer.dataset.videoPainted;
            segment.layer.dataset.videoFailed = "true";
          },
          { once: true }
        );
        video.addEventListener(
          "seeked",
          () => {
            if (segment.video === video && segment.loadedSource === source) {
              segment.layer.dataset.videoPainted = "true";
            }
          },
          { once: true }
        );

        segment.layer.append(video);
        segment.objectUrl = objectUrl;
        segment.video = video;
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof Error && error.name === "AbortError") ||
          segment.loadedSource !== source
        ) {
          return;
        }
        segment.layer.dataset.videoFailed = "true";
        segment.failed = true;
        segment.loading = false;
      }
    };

    const readScroll = () => {
      const pageY = window.scrollY || window.pageYOffset;
      const y = clamp(pageY - rootTop, 0, total);
      const crossfade = 0.1 * viewportHeight;
      let currentIndex = 0;

      for (const [index, segment] of runtime.entries()) {
        if (y >= segment.start) {
          currentIndex = index;
        }

        const length = Math.max(segment.end - segment.start, 1);
        const local = clamp((y - segment.start) / length);
        segment.target = segment.linger
          ? lingerEase(local, segment.linger)
          : local;

        let outside = 0;
        if (y < segment.start) {
          outside = segment.start - y;
        }
        if (y > segment.end) {
          outside = y - segment.end;
        }
        let opacity = smoothstep(1 - outside / Math.max(crossfade, 1));
        if (reduceMotion) {
          opacity = outside === 0 ? 1 : 0;
        }

        segment.visible = opacity > 0.001;
        segment.layer.style.opacity = String(opacity);
        segment.layer.style.zIndex = index === currentIndex ? "2" : "1";

        if (
          y > segment.start - 1.5 * viewportHeight &&
          y < segment.end + 1.5 * viewportHeight
        ) {
          void loadClip(segment);
        }
      }

      const current = runtime[currentIndex];
      const currentLength = Math.max(current.end - current.start, 1);
      const currentProgress = clamp((y - current.start) / currentLength);
      const nextActive =
        current.kind === "connector" && currentProgress >= 0.5
          ? current.nextSectionIndex
          : current.sectionIndex;

      if (nextActive !== active) {
        active = nextActive;
        root.dataset.activeSection = String(active);
        setActiveSection(active);
        onActiveRef.current?.(active);
      }

      root.style.setProperty("--ss-progress", String(clamp(y / total)));
    };

    const updateVideos = () => {
      for (const segment of runtime) {
        const { video } = segment;
        if (!video || !segment.ready || video.seeking) {
          continue;
        }
        if (
          !segment.visible &&
          Math.abs(segment.current - segment.target) < 0.002
        ) {
          continue;
        }

        segment.current += (segment.target - segment.current) * 0.2;
        const targetTime =
          clamp(segment.current, 0, 0.999) * (video.duration || 1);
        const epsilon = isMobile() ? 0.02 : 0.008;
        if (Math.abs(video.currentTime - targetTime) > epsilon) {
          try {
            video.currentTime = targetTime;
          } catch {
            // Keep the last painted frame while the browser catches up.
          }
        }
      }
    };

    const tick = () => {
      if (destroyed) {
        return;
      }
      if (dirty) {
        dirty = false;
        readScroll();
      }
      updateVideos();
      frame = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      dirty = true;
    };
    const onResize = () => {
      if (coarsePointer && window.innerWidth === layoutWidth) {
        return;
      }
      layout();
    };
    const onFirstGesture = () => {
      if (userReady) {
        return;
      }
      userReady = true;
      for (const segment of runtime) {
        void primeVideo(segment.video);
      }
    };

    controllerRef.current = {
      jumpToSection(index) {
        const segment = runtime.find(
          (candidate) =>
            candidate.kind === "scene" && candidate.sectionIndex === index
        );
        if (!segment) {
          return;
        }
        const top =
          rootTop + segment.start + 0.15 * (segment.end - segment.start);
        window.scrollTo({
          behavior: reduceMotion ? "auto" : "smooth",
          top,
        });
      },
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", layout);
    window.addEventListener("pointerdown", onFirstGesture, {
      once: true,
      passive: true,
    });
    window.addEventListener("touchstart", onFirstGesture, {
      once: true,
      passive: true,
    });

    layout();
    frame = window.requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      controllerRef.current = null;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", layout);
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
      root.style.removeProperty("--ss-progress");
      delete root.dataset.activeSection;

      for (const segment of runtime) {
        unloadClip(segment);
        segment.layer.style.removeProperty("opacity");
        segment.layer.style.removeProperty("z-index");
      }
    };

}
const cleanup=initializeScrollScrub(document.querySelector(".scroll-scrub"));
window.addEventListener("pagehide",(event)=>{if(!event.persisted)cleanup?.();});

/* Accessible static-page adapters for the approved menu and receipt UI. */
document.body.classList.remove("no-js");
const menuButton=document.querySelector(".menu-toggle");
const menu=document.getElementById("main-navigation");
function setMenu(open,returnFocus=false){
 if(!menuButton||!menu)return;
 menuButton.setAttribute("aria-expanded",String(open));
 menu.classList.toggle("is-open",open);
 menuButton.querySelector(".menu-label").textContent=open?"Close":"Menu";
 menuButton.querySelector("use").setAttribute("href","/assets/icons/homepage-icons.svg#"+(open?"x":"list"));
 if(returnFocus)menuButton.focus();
}
menuButton?.addEventListener("click",()=>setMenu(menuButton.getAttribute("aria-expanded")!=="true"));
menu?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setMenu(false)));
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&menuButton?.getAttribute("aria-expanded")==="true")setMenu(false,true);});
const tabs=[...document.querySelectorAll(".receipt-tabs [role=tab]")];
const panels=[...document.querySelectorAll(".receipt-panel")];
function selectReceipt(index,focus=false){
 tabs.forEach((tab,i)=>{tab.setAttribute("aria-selected",String(i===index));tab.tabIndex=i===index?0:-1;});
 panels.forEach((panel,i)=>panel.hidden=i!==index);
 const counter=document.querySelector(".receipt-counter");
 if(counter){counter.textContent=String(index+1).padStart(2,"0")+" / 04";counter.setAttribute("aria-label","Step "+(index+1)+" of 4");}
 if(focus)tabs[index].focus();
}
tabs.forEach((tab,index)=>{
 tab.addEventListener("click",()=>selectReceipt(index));
 tab.addEventListener("keydown",event=>{
  let next=index;
  if(event.key==="ArrowRight")next=(index+1)%tabs.length;
  else if(event.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=tabs.length-1;
  else return;
  event.preventDefault();selectReceipt(next,true);
 });
});
const legacyHashes={question:"home",problem:"approach",capabilities:"approach",system:"approach",platform:"receipt",outcomes:"receipt","before-you-commit":"questions"};
function followLegacyHash(){const id=legacyHashes[location.hash.slice(1)];if(id)document.getElementById(id)?.scrollIntoView();}
window.addEventListener("hashchange",followLegacyHash);
if(location.hash)requestAnimationFrame(()=>requestAnimationFrame(followLegacyHash));
