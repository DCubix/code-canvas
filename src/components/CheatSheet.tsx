import { createSignal, For, Show } from 'solid-js'

interface Section {
  title: string
  content: SectionContent
}

type SectionContent =
  | { kind: 'text'; lines: string[] }
  | { kind: 'examples'; items: { code: string; desc: string }[] }
  | { kind: 'builtins'; items: { name: string; sig: string; desc: string }[] }

const sections: Section[] = [
  {
    title: 'Basics',
    content: {
      kind: 'text',
      lines: [
        'Code Canvas is a visual language for composing pixel-based images.',
        'Every expression ultimately produces a pixel function — a function that takes (x, y, t) coordinates (0–1 range) and returns a color.',
        'The canvas renders your final expression as a 256×256 image.',
        'Statements are separated by semicolons (;).',
        'Comments start with -- and continue to the end of the line.',
      ],
    },
  },
  {
    title: 'Variables',
    content: {
      kind: 'examples',
      items: [
        { code: "let bg = solid 'red';", desc: 'Bind a value to a name for reuse.' },
        { code: 'let n = noise 4;', desc: 'Store a noise pattern in a variable.' },
      ],
    },
  },
  {
    title: 'Custom Operators (Functions)',
    content: {
      kind: 'examples',
      items: [
        { code: 'op myEffect x = invert x;', desc: 'Define a custom operator with parameters.' },
        { code: 'op tinted c src = colorize c \'white\' src;', desc: 'Multiple parameters are space-separated.' },
        { code: 'noise 4 |> myEffect;', desc: 'Then use it like any built-in.' },
      ],
    },
  },
  {
    title: 'Pipe Operator (|>)',
    content: {
      kind: 'examples',
      items: [
        { code: "noise 4 |> threshold 0.5;", desc: 'Pipes the left result as the last argument of the right call.' },
        { code: "noise 4 |> invert |> colorize 'red' 'blue';", desc: 'Chain multiple operations left to right.' },
      ],
    },
  },
  {
    title: 'Arithmetic',
    content: {
      kind: 'examples',
      items: [
        { code: '(2 + 3)', desc: 'Arithmetic must be wrapped in parentheses.' },
        { code: '(10 / 2)', desc: 'Supports +, -, *, / operators.' },
        { code: 'noise (1 / 8)', desc: 'Use it inside expressions.' },
      ],
    },
  },
  {
    title: 'Special Identifiers',
    content: {
      kind: 'examples',
      items: [
        { code: 'x', desc: 'A gradient from black (left) to white (right).' },
        { code: 'y', desc: 'A gradient from black (top) to white (bottom).' },
        { code: 't', desc: 'The time variable (for animations).' },
      ],
    },
  },
  {
    title: 'Preloading Images',
    content: {
      kind: 'examples',
      items: [
        { code: "preload 'https://example.com/photo.png';", desc: 'Preload an external image by URL.' },
        { code: "preload 'https://example.com/photo.png' as 'photo';", desc: 'Give it a friendly name.' },
        { code: "image 'photo';", desc: 'Then reference it in your code.' },
      ],
    },
  },
  {
    title: 'Lists',
    content: {
      kind: 'examples',
      items: [
        { code: "[1, 2, 3]", desc: 'Create a list of values with square brackets.' },
        { code: "['red', 'blue']", desc: 'Lists can hold any value type.' },
        { code: "stripes ['red', 'white', 'blue'];", desc: 'Many operators accept lists — see List Operators below.' },
      ],
    },
  },
  {
    title: 'Colors',
    content: {
      kind: 'text',
      lines: [
        "Colors are strings passed to operators. Supported formats:",
        "  Hex:    '#ff0000', '#f00'",
        "  RGB:    'rgb(255, 0, 0)'",
        "  RGBA:   'rgba(255, 0, 0, 0.5)'",
        "  Named:  'red', 'blue', 'green', 'cyan', 'magenta', 'yellow', 'white', 'black', 'gray'",
      ],
    },
  },
  {
    title: 'Generators',
    content: {
      kind: 'builtins',
      items: [
        { name: 'solid', sig: "solid color", desc: "Fill with a solid color. Ex: solid 'cyan'" },
        { name: 'gradient', sig: "gradient color1 color2", desc: "Horizontal gradient between two colors." },
        { name: 'noise', sig: "noise scale", desc: "Perlin noise pattern. Higher scale = more detail." },
        { name: 'checker', sig: "checker size", desc: "Checkerboard pattern. Size controls grid density." },
        { name: 'bricks', sig: "bricks count mortar smoothness", desc: "Brick wall pattern with mortar width and edge smoothness." },
        { name: 'image', sig: "image name", desc: "Use a preloaded image as a pixel source." },
      ],
    },
  },
  {
    title: 'Color Adjustments',
    content: {
      kind: 'builtins',
      items: [
        { name: 'invert', sig: "invert input", desc: "Invert all colors." },
        { name: 'colorize', sig: "colorize dark light input", desc: "Map dark pixels to one color, light pixels to another." },
        { name: 'threshold', sig: "threshold level input", desc: "Convert to black/white at the given brightness level (0–1)." },
        { name: 'saturation', sig: "saturation level input", desc: "Adjust color saturation. 0 = grayscale, 1 = original, >1 = boosted." },
        { name: 'contrast', sig: "contrast level input", desc: "Adjust contrast. 1 = original, >1 = more contrast." },
      ],
    },
  },
  {
    title: 'Transforms',
    content: {
      kind: 'builtins',
      items: [
        { name: 'rotate', sig: "rotate degrees input", desc: "Rotate the image around its center." },
        { name: 'scale', sig: "scale fx fy input", desc: "Scale the image. Values >1 zoom in, <1 zoom out." },
        { name: 'translate', sig: "translate dx dy input", desc: "Shift the image by dx/dy in normalized coords (0–1)." },
        { name: 'tile', sig: "tile nx ny input", desc: "Repeat the image nx times on X and ny times on Y." },
        { name: 'swirl', sig: "swirl turns input", desc: "Apply a swirl distortion. Turns controls intensity." },
        { name: 'polar', sig: "polar input", desc: "Remap coordinates to polar (angle → x, radius → y) around center." },
        { name: 'displace', sig: "displace map amount input", desc: "Warp the image using another image as a displacement map." },
      ],
    },
  },
  {
    title: 'Blending',
    content: {
      kind: 'builtins',
      items: [
        { name: 'blend', sig: "blend mode a b", desc: "Blend two images. Modes: 'add', 'multiply', 'screen', 'overlay', 'composite'." },
      ],
    },
  },
  {
    title: 'List Operators',
    content: {
      kind: 'builtins',
      items: [
        { name: 'stripes', sig: "stripes [colors...]", desc: "Vertical stripes from a list of colors." },
        { name: 'palette', sig: "palette [colors...] input", desc: "Posterize: map brightness to discrete colors from the list." },
        { name: 'stack', sig: "stack [layers...]", desc: "Alpha-composite a list of images, bottom to top." },
        { name: 'mix', sig: "mix [inputs...]", desc: "Average all images in the list together." },
      ],
    },
  },
  {
    title: 'Example Programs',
    content: {
      kind: 'examples',
      items: [
        {
          code: "noise 4 |> threshold 0.5 |> colorize 'red' 'blue';",
          desc: 'Noise → black/white → recolor.',
        },
        {
          code: "let bg = gradient '#1a1a2e' '#e94560';\nlet pattern = checker 8 |> rotate 45;\nblend 'overlay' bg pattern;",
          desc: 'Gradient background with a rotated checker overlay.',
        },
        {
          code: "noise 8 |> swirl 2 |> colorize '#0d1b2a' '#e0fbfc';",
          desc: 'Swirled noise with custom colors.',
        },
        {
          code: "bricks 6 0.05 0.02 |> colorize '#8b4513' '#d2691e';",
          desc: 'Brick wall texture with warm tones.',
        },
      ],
    },
  },
]

export default function CheatSheet(props: { onClose: () => void }) {
  const [openIdx, setOpenIdx] = createSignal<number | null>(null)

  function toggle(i: number) {
    setOpenIdx(openIdx() === i ? null : i)
  }

  return (
    <div class="h-full flex flex-col bg-[#1e1e2e] text-[#cdd6f4] overflow-hidden">
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
        <h2 class="text-sm font-bold font-mono tracking-wide uppercase text-[#cba6f7]">
          Cheat Sheet
        </h2>
        <button
          onClick={props.onClose}
          class="text-[#6c7086] hover:text-[#cdd6f4] transition-colors text-lg leading-none cursor-pointer"
          aria-label="Close cheat sheet"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        <For each={sections}>
          {(section, i) => (
            <div class="border-b border-[#313244]/50 last:border-b-0">
              <button
                onClick={() => toggle(i())}
                class="w-full flex items-center justify-between py-2 text-left cursor-pointer group"
              >
                <span class="text-sm font-semibold text-[#89b4fa] group-hover:text-[#b4d0fb] transition-colors">
                  {section.title}
                </span>
                <span class="text-[#6c7086] text-xs transition-transform" classList={{ 'rotate-90': openIdx() === i() }}>
                  ▶
                </span>
              </button>

              <Show when={openIdx() === i()}>
                <div class="pb-3 pl-1">
                  {renderContent(section.content)}
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function renderContent(content: SectionContent) {
  switch (content.kind) {
    case 'text':
      return (
        <div class="space-y-1.5">
          <For each={content.lines}>
            {(line) => (
              <p class="text-xs text-[#a6adc8] leading-relaxed whitespace-pre-wrap">{line}</p>
            )}
          </For>
        </div>
      )
    case 'examples':
      return (
        <div class="space-y-2.5">
          <For each={content.items}>
            {(item) => (
              <div>
                <pre class="text-xs bg-[#181825] text-[#a6e3a1] rounded px-2.5 py-1.5 overflow-x-auto font-mono whitespace-pre-wrap">{item.code}</pre>
                <p class="text-xs text-[#6c7086] mt-1 pl-0.5">{item.desc}</p>
              </div>
            )}
          </For>
        </div>
      )
    case 'builtins':
      return (
        <div class="space-y-2.5">
          <For each={content.items}>
            {(item) => (
              <div>
                <code class="text-xs font-mono bg-[#181825] text-[#f9e2af] rounded px-2 py-1 inline-block">{item.sig}</code>
                <p class="text-xs text-[#6c7086] mt-1 pl-0.5">{item.desc}</p>
              </div>
            )}
          </For>
        </div>
      )
  }
}
