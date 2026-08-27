import type { VideoComposition } from "@/lib/ai/video-scenes";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Gera uma composição HyperFrames válida e determinística: um clip por cena
 * (todas dentro do mesmo index.html standalone, sem sub-composições), texto
 * central com fade+scale de entrada. Segue o contrato mínimo documentado em
 * hyperframes-core/references/minimal-composition.md.
 */
export function buildCompositionHtml(composition: VideoComposition): string {
  const { designSystem, storyboard } = composition;
  const width = 1920;
  const height = 1080;

  let cursor = 0;
  const clips = storyboard.map((scene, i) => {
    const start = cursor;
    cursor += scene.durationSeconds;
    return { id: `scene-${i}`, start, duration: scene.durationSeconds, text: scene.text };
  });
  const totalDuration = cursor;

  const clipSections = clips
    .map(
      (clip) => `      <section id="${clip.id}" class="clip" data-start="${clip.start}" data-duration="${clip.duration}">
        <h1 id="${clip.id}-text">${escapeHtml(clip.text)}</h1>
        <div class="accent-line" id="${clip.id}-line"></div>
      </section>`
    )
    .join("\n");

  const timelineCalls = clips
    .map(
      (clip) =>
        `      tl.fromTo("#${clip.id}-text", { autoAlpha: 0, y: 24, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }, ${clip.start});
      tl.fromTo("#${clip.id}-line", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, ${clip.start + 0.15});`
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>Vídeo da aula</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: ${designSystem.backgroundColor}; }
      #root {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        font-family: "Space Grotesk", Arial, sans-serif;
      }
      .clip {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 160px;
        text-align: center;
      }
      .clip h1 {
        color: ${designSystem.textColor};
        font-size: 76px;
        font-weight: 700;
        line-height: 1.25;
        max-width: 1400px;
      }
      .accent-line {
        margin-top: 40px;
        width: 140px;
        height: 6px;
        border-radius: 3px;
        background: ${designSystem.accentColor};
        transform-origin: center;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-width="${width}"
      data-height="${height}"
      data-duration="${totalDuration}"
    >
${clipSections}
    </div>
    <script>
      document.fonts.ready.then(() => {
        const tl = gsap.timeline({ paused: true });
${timelineCalls}
        window.__timelines["main"] = tl;
      });
    </script>
  </body>
</html>
`;
}
