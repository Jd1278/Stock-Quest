import { useEffect, useRef } from "react";
let apiPromise: Promise<any> | null = null;
function loadYouTube() {
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      const w = window as any;
      if (w.YT?.Player) {
        resolve(w.YT);
        return;
      }
      const timer = setTimeout(
        () => reject(new Error("Video no disponible.")),
        15000,
      );
      w.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        resolve(w.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Video no disponible."));
      };
      document.head.appendChild(script);
    });
  return apiPromise;
}
export default function YouTubePlayer({ videoId }: { videoId: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true,
      player: any;
    const node = document.createElement("div");
    host.current?.appendChild(node);
    void loadYouTube()
      .then((YT) => {
        if (active)
          player = new YT.Player(node, {
            videoId,
            width: "100%",
            height: "320",
            playerVars: { origin: window.location.origin, rel: 0 },
            events: {
              onError: () => {
                if (active && host.current)
                  host.current.textContent =
                    "El video no está disponible. Puedes continuar con la microlección.";
              },
            },
          });
      })
      .catch(() => {
        if (active && host.current)
          host.current.textContent =
            "No se pudo cargar el video. Puedes continuar con la microlección.";
      });
    return () => {
      active = false;
      player?.destroy();
      node.remove();
    };
  }, [videoId]);
  return <div ref={host} className="video" aria-label="Video de la lección" />;
}
