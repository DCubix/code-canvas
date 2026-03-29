import { createSignal, createEffect, Show } from 'solid-js'
import Editor from './components/Editor'
import CheatSheet from './components/CheatSheet'
import { parser } from './lang/grammar/parser'
import { transformProgram } from './lang/ast/transform'
import { evaluate } from './lang/interpreter/evaluator'
import { Environment } from './lang/interpreter/environment'
import { registerBuiltins } from './lang/interpreter/builtins'
import { render } from './lang/runtime/renderer'
import type { PixelFn } from './lang/interpreter/types'
import type { Preload, Program } from './lang/ast/types'

function extractPreloads(ast: Program): Preload[] {
  return ast.body.filter((s): s is Preload => s.type === 'preload')
}

function loadImage(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

const INITIAL_CODE = `noise 4 |> threshold 0.5 |> colorize 'red' 'blue';`

function App() {
  const [code, setCode] = createSignal(INITIAL_CODE)
  const [error, setError] = createSignal<string | null>(null)
  const [showCheatSheet, setShowCheatSheet] = createSignal(true)
  const [canvasSize, setCanvasSize] = createSignal(256)
  let canvas!: HTMLCanvasElement

  const imageCache = new Map<string, ImageData>()

  // Debounced evaluation
  let timer: ReturnType<typeof setTimeout>
  function onCodeChange(newCode: string) {
    clearTimeout(timer)
    timer = setTimeout(() => setCode(newCode), 300)
  }

  function runEval(ast: Program, images: Map<string, ImageData>) {
    const env = new Environment()
    registerBuiltins(env, images)
    const result = evaluate(ast, env)

    if (typeof result === 'function') {
      const fn = result as PixelFn
      const size = canvasSize()
      const imageData = render(fn, size, size)
      const ctx = canvas?.getContext('2d')
      if (ctx) ctx.putImageData(imageData, 0, 0)
    }
    setError(null)
  }

  // Re-evaluate and render whenever code changes
  createEffect(() => {
    const src = code()
    try {
      const tree = parser.parse(src)
      const ast = transformProgram(tree, src)
      const preloads = extractPreloads(ast)

      // Figure out which images still need loading
      const needed = preloads.filter(p => !imageCache.has(p.url))
      if (needed.length === 0) {
        // All images already cached, build the name→ImageData map and run
        const images = new Map<string, ImageData>()
        for (const p of preloads) {
          images.set(p.name, imageCache.get(p.url)!)
        }
        runEval(ast, images)
      } else {
        // Load missing images, then re-run
        Promise.all(
          needed.map(p =>
            loadImage(p.url).then(data => {
              imageCache.set(p.url, data)
            })
          )
        ).then(() => {
          const images = new Map<string, ImageData>()
          for (const p of preloads) {
            images.set(p.name, imageCache.get(p.url)!)
          }
          runEval(ast, images)
        }).catch(e => {
          setError((e as Error).message)
        })
      }
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  })

  return (
    <div class="h-screen flex flex-col bg-neutral-900 text-neutral-100">
      <header class="p-3 border-b border-neutral-700 text-sm font-mono flex items-center justify-between">
        <span>code-canvas</span>
        <button
          onClick={() => setShowCheatSheet(v => !v)}
          class="px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer"
          classList={{
            'border-[#cba6f7] text-[#cba6f7] bg-[#cba6f7]/10': showCheatSheet(),
            'border-neutral-600 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500': !showCheatSheet(),
          }}
        >
          {showCheatSheet() ? 'Hide' : 'Show'} Cheat Sheet
        </button>
      </header>
      <div class="flex flex-1 min-h-0">
        {/* Cheat sheet panel */}
        <Show when={showCheatSheet()}>
          <div class="w-72 min-w-72 border-r border-neutral-700 overflow-hidden">
            <CheatSheet onClose={() => setShowCheatSheet(false)} />
          </div>
        </Show>
        {/* Editor panel */}
        <div class="flex-1 min-w-0">
          <Editor initialCode={INITIAL_CODE} onCodeChange={onCodeChange} />
        </div>
        {/* Preview panel */}
        <div class="flex-1 flex flex-col items-stretch border-l border-neutral-700">
          {/* Toolbar */}
          <div class="flex items-center gap-3 px-4 py-2 border-b border-neutral-700 text-xs">
            <label class="flex items-center gap-1.5 text-neutral-400">
              Size
              <select
                value={canvasSize()}
                onChange={e => setCanvasSize(Number(e.currentTarget.value))}
                class="bg-neutral-800 border border-neutral-600 rounded px-1.5 py-0.5 text-neutral-100 cursor-pointer"
              >
                <option value={64}>64 × 64</option>
                <option value={128}>128 × 128</option>
                <option value={256}>256 × 256</option>
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024</option>
              </select>
            </label>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.download = `code-canvas-${canvasSize()}x${canvasSize()}.png`
                link.href = canvas.toDataURL('image/png')
                link.click()
              }}
              class="px-2 py-0.5 rounded border border-neutral-600 text-neutral-300 hover:text-neutral-100 hover:border-neutral-500 transition-colors cursor-pointer"
            >
              Save PNG
            </button>
          </div>
          {/* Canvas */}
          <div class="flex-1 flex items-center justify-center p-4">
            <canvas
              ref={canvas}
              width={canvasSize()}
              height={canvasSize()}
              class="border border-neutral-700 rounded"
              style={{
                'image-rendering': 'pixelated',
                'background-image': `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`,
                'background-size': '16px 16px',
                'background-position': '0 0, 0 8px, 8px -8px, -8px 0px',
                'background-color': '#333',
              }}
            />
          </div>
          {error() && (
            <pre class="text-red-400 text-xs px-4 pb-3 max-w-xs overflow-auto whitespace-pre-wrap">
              {error()}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

export default App