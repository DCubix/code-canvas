import { onMount } from 'solid-js'
import type { PixelFn } from '../lang/interpreter/types'
import { render } from '../lang/runtime/renderer'

interface CanvasProps {
  pixelFn: () => PixelFn | null
  size?: number
}

export default function Canvas(props: CanvasProps) {
  let canvas!: HTMLCanvasElement
  const size = () => props.size ?? 256

  onMount(() => {
    const ctx = canvas.getContext('2d')!
    
    // Re-render whenever pixelFn changes
    const update = () => {
      const fn = props.pixelFn()
      if (!fn) return
      const imageData = render(fn, size(), size())
      ctx.putImageData(imageData, 0, 0)
    }

    // Use createEffect if you want reactivity, or call manually
    update()
  })

  return (
    <canvas
      ref={canvas}
      width={size()}
      height={size()}
      class="border border-neutral-700 rounded"
      style={{ 'image-rendering': 'pixelated' }}
    />
  )
}