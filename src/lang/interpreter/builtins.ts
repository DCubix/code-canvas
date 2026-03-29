import type { Environment } from "./environment"
import { color, colorShade, type Color, type PixelFn, type Value } from "./types"

function parseColor(s: string): Color {
    // Html color (hex)
    if (s.startsWith('#')) {
        const hex = s.slice(1)
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16) / 255
            const g = parseInt(hex[1] + hex[1], 16) / 255
            const b = parseInt(hex[2] + hex[2], 16) / 255
            return color(r, g, b)
        } else if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16) / 255
            const g = parseInt(hex.slice(2, 4), 16) / 255
            const b = parseInt(hex.slice(4, 6), 16) / 255
            return color(r, g, b)
        }
    }
    // rgb() or rgba()
    const rgbMatch = s.match(/^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(\d*\.?\d+))?\)$/)
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]) / 255
        const g = parseInt(rgbMatch[2]) / 255
        const b = parseInt(rgbMatch[3]) / 255
        const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
        return color(r, g, b, a)
    }

    // named colors
    const namedColors: Record<string, Color> = {
        'black': color(0, 0, 0),
        'white': color(1, 1, 1),
        'red': color(1, 0, 0),
        'green': color(0, 1, 0),
        'blue': color(0, 0, 1),
        'yellow': color(1, 1, 0),
        'cyan': color(0, 1, 1),
        'magenta': color(1, 0, 1),
        'gray': color(0.5, 0.5, 0.5),
        'grey': color(0.5, 0.5, 0.5),
        // Add more named colors as needed
    }
    if (s.toLowerCase() in namedColors) {
        return namedColors[s.toLowerCase()]
    }

    throw new Error(`Invalid color string: ${s}`)
}

function toPixelFn(value: Value): PixelFn {
    if (typeof value === 'function') return value as PixelFn;
    if (typeof value === 'number') {
        const n = value
        return () => colorShade(n)
    }
    if (typeof value === 'string') {
        const c = parseColor(value)
        return () => c
    }
    if (typeof value === 'object' && value !== null && 'r' in value) {
        const c = value as Color
        return () => c
    }
    throw new Error(`Cannot convert value to PixelFn: ${value} (${typeof value})`)
}

function toNumber(value: Value): number {
    if (typeof value === 'number') return value
    throw new Error(`Expected number, got ${value} (${typeof value})`)
}

function perlimNoise(): (x: number, y: number) => number {
    // Permutation table
    const perm = new Uint8Array(512)
    for (let i = 0; i < 256; i++) perm[i] = i

    // Shuffle (deterministic seed)
    for (let i = 255; i > 0; i--) {
        const j = (i * 16807 + 37) % (i + 1)  // simple LCG-based shuffle
        ;[perm[i], perm[j]] = [perm[j], perm[i]]
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]

    function fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10)
    }

    function grad(hash: number, x: number, y: number): number {
        const h = hash & 3 // Convert low 2 bits of hash code
        const u = h < 2 ? x : y // into 8 simple gradient directions
        const v = h < 2 ? y : x
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
    }

    function lerp(a: number, b: number, t: number): number {
        return a + t * (b - a)
    }

    return (x: number, y: number) => {
        const xi = Math.floor(x) & 255
        const yi = Math.floor(y) & 255
        const xf = x - Math.floor(x)
        const yf = y - Math.floor(y)
        
        const u = fade(xf)
        const v = fade(yf)

        const aa = perm[perm[xi] + yi]
        const ab = perm[perm[xi] + yi + 1]
        const ba = perm[perm[xi + 1] + yi]
        const bb = perm[perm[xi + 1] + yi + 1]

        const result = lerp(
            lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
            lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
            v
        )
        return (result + 1) / 2 // Normalize to [0, 1]
    }
}

const noise2d = perlimNoise()

export function registerBuiltins(env: Environment, images: Map<string, ImageData> = new Map()): void {
    env.registerOp({
        name: 'noise',
        params: [{ name: 'scale', type: 'number' }],
        fn: (scale: Value) => {
            const s = toNumber(scale)
            return (x, y) => {
                const v = noise2d(x * s, y * s)
                return colorShade(v)
            }
        }
    })

    env.registerOp({
        name: 'solid',
        params: [{ name: 'color', type: 'string' }],
        fn: (colorVal: Value) => {
            const c = parseColor(colorVal as string)
            const fn: PixelFn = () => c
            return fn
        }
    })

    env.registerOp({
        name: 'gradient',
        params: [
            { name: 'color1', type: 'string' },
            { name: 'color2', type: 'string' },
        ],
        fn: (c1: Value, c2: Value) => {
            const a = parseColor(c1 as string)
            const b = parseColor(c2 as string)
            const fn: PixelFn = (x) => {
                return color(
                    a.r + (b.r - a.r) * x,
                    a.g + (b.g - a.g) * x,
                    a.b + (b.b - a.b) * x,
                    1
                )
            }
            return fn
        }
    })

    env.registerOp({
        name: 'checker',
        params: [
            { name: 'size', type: 'number' },
        ],
        fn: (size: Value) => {
            const s = toNumber(size)
            return (x: number, y: number) => {
                const v = (Math.floor(x * s) + Math.floor(y * s)) % 2
                return colorShade(v)
            }
        }
    })

    env.registerOp({
        name: 'threshold',
        params: [
            { name: 'level', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (level: Value, input: Value) => {
            const l = toNumber(level)
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                const gray = 0.299 * v.r + 0.587 * v.g + 0.114 * v.b
                return colorShade(gray >= l ? 1 : 0)
            }
        }
    })

    env.registerOp({
        name: 'invert',
        params: [
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (input: Value) => {
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                return color(1 - v.r, 1 - v.g, 1 - v.b, v.a)
            }
        }
    })

    env.registerOp({
        name: 'colorize',
        params: [
            { name: 'colorA', type: 'string' },
            { name: 'colorB', type: 'string' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (colorA: Value, colorB: Value, input: Value) => {
            const cA = parseColor(colorA as string)
            const cB = parseColor(colorB as string)
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                const luma = 0.299 * v.r + 0.587 * v.g + 0.114 * v.b
                return color(
                    cA.r * (1 - luma) + cB.r * luma,
                    cA.g * (1 - luma) + cB.g * luma,
                    cA.b * (1 - luma) + cB.b * luma,
                    1
                )
            }
        }
    })

    env.registerOp({
        name: 'rotate',
        params: [
            { name: 'angle', type: 'number' }, // rotation angle in degrees
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (angle: Value, input: Value) => {
            const a = toNumber(angle) * Math.PI / 180 // convert to radians
            const src = toPixelFn(input)
            const cos = Math.cos(a)
            const sin = Math.sin(a)
            const fn: PixelFn = (x, y, t) => {
                // Rotate around center (0.5, 0.5)
                const cx = x - 0.5, cy = y - 0.5
                const rx = cx * cos - cy * sin + 0.5
                const ry = cx * sin + cy * cos + 0.5
                return src(rx, ry, t)
            }
            return fn
        }
    })

    env.registerOp({
        name: 'scale',
        params: [
            { name: 'fx', type: 'number' },
            { name: 'fy', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (fx: Value, fy: Value, input: Value) => {
            const sx = toNumber(fx)
            const sy = toNumber(fy)
            const src = toPixelFn(input)
            return (x, y, t) => {
                const nsx = 0.5 + (x - 0.5) / sx
                const nsy = 0.5 + (y - 0.5) / sy
                return src(nsx, nsy, t)
            }
        }
    })

    env.registerOp({
        name: 'blend',
        params: [
            { name: 'mode', type: 'string' },
            { name: 'a', type: 'pixelfn' },
            { name: 'b', type: 'pixelfn' },
        ],
        fn: (mode: Value, a: Value, b: Value) => {
            const m = mode as string
            const fnA = toPixelFn(a)
            const fnB = toPixelFn(b)
            return (x, y, t) => {
                const ca = fnA(x, y, t)
                const cb = fnB(x, y, t)
                switch (m) {
                    case 'add':
                        return color(
                            Math.min(ca.r + cb.r, 1),
                            Math.min(ca.g + cb.g, 1),
                            Math.min(ca.b + cb.b, 1),
                            Math.min(ca.a + cb.a, 1)
                        )
                    case 'multiply':
                        return color(
                            ca.r * cb.r,
                            ca.g * cb.g,
                            ca.b * cb.b,
                            ca.a * cb.a
                        )
                    case 'screen':
                        return color(
                            1 - (1 - ca.r) * (1 - cb.r),
                            1 - (1 - ca.g) * (1 - cb.g),
                            1 - (1 - ca.b) * (1 - cb.b),
                            1 - (1 - ca.a) * (1 - cb.a)
                        )
                    case 'overlay':
                        return color(
                            ca.r < 0.5 ? (2 * ca.r * cb.r) : (1 - 2 * (1 - ca.r) * (1 - cb.r)),
                            ca.g < 0.5 ? (2 * ca.g * cb.g) : (1 - 2 * (1 - ca.g) * (1 - cb.g)),
                            ca.b < 0.5 ? (2 * ca.b * cb.b) : (1 - 2 * (1 - ca.b) * (1 - cb.b)),
                            ca.a < 0.5 ? (2 * ca.a * cb.a) : (1 - 2 * (1 - ca.a) * (1 - cb.a))
                        )
                    case 'composite':
                        return color(
                            cb.r + ca.r * (1 - cb.a),
                            cb.g + ca.g * (1 - cb.a),
                            cb.b + ca.b * (1 - cb.a),
                            cb.a + ca.a * (1 - cb.a)
                        )
                    default:
                        throw new Error(`Unknown blend mode: ${m}`)
                }
            }
        }
    })

    // deform image by another image (dieplacement)
    env.registerOp({
        name: 'displace',
        params: [
            { name: 'displacement', type: 'pixelfn' },
            { name: 'scale', type: 'number' },
            { name: 'source', type: 'pixelfn' },
        ],
        fn: (displacement: Value, scale: Value, source: Value) => {
            const disp = toPixelFn(displacement)
            const s = toNumber(scale)
            const src = toPixelFn(source)
            return (x, y, t) => {
                const d = disp(x, y, t)
                const dx = (d.r - 0.5) * s
                const dy = (d.g - 0.5) * s
                return src(x + dx, y + dy, t)
            }
        }
    })

    function fract(n: number): number {
        return n - Math.floor(n)
    }

    function smoothstep(edge0: number, edge1: number, x: number): number {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
        return t * t * (3 - 2 * t)
    }

    // bricks pattern
    env.registerOp({
        name: 'bricks',
        params: [
            { name: 'bricks', type: 'number' },
            { name: 'mortar', type: 'number' },
            { name: 'smoothness', type: 'number' },
        ],
        fn: (bricks: Value, mortar: Value, smoothness: Value) => {
            const bs = toNumber(bricks)
            const bx = bs
            const by = bs * 2.0
            const m = toNumber(mortar)
            const s = toNumber(smoothness)
            return (x: number, y: number) => {
                x *= bx
                y *= by

                x += (Math.floor(y) % 2) * 0.5
                const cellX = fract(x)
                const cellY = fract(y)

                const centerX = Math.abs(cellX - 0.5) * 2.0
                const centerY = Math.abs(cellY - 0.5) * 2.0

                const edgeX = 1.0 - m * 0.5
                const edgeY = 1.0 - m
                const maskX = 1.0 - smoothstep(edgeX - s, edgeX, centerX)
                const maskY = 1.0 - smoothstep(edgeY - s, edgeY, centerY)

                return colorShade(maskX * maskY)
            }
        }
    })

    env.registerOp({
        name: 'image',
        params: [{ name: 'name', type: 'string' }],
        fn: (name: Value) => {
            const imgName = name as string
            const imgData = images.get(imgName)
            if (!imgData) throw new Error(`Image not preloaded: '${imgName}'`)
            const w = imgData.width
            const h = imgData.height
            const buf = imgData.data
            const fn: PixelFn = (x, y) => {
                const px = Math.floor(x * (w - 1)) % w
                const py = Math.floor(y * (h - 1)) % h
                const i = (py * w + (px < 0 ? px + w : px)) * 4
                return color(buf[i] / 255, buf[i + 1] / 255, buf[i + 2] / 255, buf[i + 3] / 255)
            }
            return fn
        }
    })

    env.registerOp({
        name: 'swirl',
        params: [
            { name: 'turns', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (turns: Value, input: Value) => {
            const a = toNumber(turns) * 2 * Math.PI // convert turns to radians
            const src = toPixelFn(input)
            const fn: PixelFn = (x, y, t) => {
                // Swirl around center (0.5, 0.5)
                const cx = x - 0.5, cy = y - 0.5
                const r = Math.sqrt(cx * cx + cy * cy)
                const theta = Math.atan2(cy, cx) + a * r
                const sx = r * Math.cos(theta) + 0.5
                const sy = r * Math.sin(theta) + 0.5
                return src(sx, sy, t)
            }
            return fn
        }
    })

    env.registerOp({
        name: 'saturation',
        params: [
            { name: 'level', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (level: Value, input: Value) => {
            const l = toNumber(level)
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                const gray = 0.299 * v.r + 0.587 * v.g + 0.114 * v.b
                return color(
                    gray + (v.r - gray) * l,
                    gray + (v.g - gray) * l,
                    gray + (v.b - gray) * l,
                    v.a
                )
            }
        }
    })

    env.registerOp({
        name: 'contrast',
        params: [
            { name: 'level', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (level: Value, input: Value) => {
            const l = toNumber(level)
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                return color(
                    0.5 + (v.r - 0.5) * l,
                    0.5 + (v.g - 0.5) * l,
                    0.5 + (v.b - 0.5) * l,
                    v.a
                )
            }
        }
    })

    env.registerOp({
        name: 'translate',
        params: [
            { name: 'dx', type: 'number' },
            { name: 'dy', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (dx: Value, dy: Value, input: Value) => {
            const ox = toNumber(dx)
            const oy = toNumber(dy)
            const src = toPixelFn(input)
            return (x: number, y: number, t: number) => src(x - ox, y - oy, t)
        }
    })

    env.registerOp({
        name: 'tile',
        params: [
            { name: 'nx', type: 'number' },
            { name: 'ny', type: 'number' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (nx: Value, ny: Value, input: Value) => {
            const tx = toNumber(nx)
            const ty = toNumber(ny)
            const src = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const mx = ((x * tx) % 1 + 1) % 1
                const my = ((y * ty) % 1 + 1) % 1
                return src(mx, my, t)
            }
        }
    })

    // --- List-based operators ---

    env.registerOp({
        name: 'stack',
        params: [{ name: 'layers', type: 'value' }],
        fn: (layers: Value) => {
            if (!Array.isArray(layers)) throw new Error('stack expects a list of images')
            const fns = (layers as Value[]).map(toPixelFn)
            return (x: number, y: number, t: number) => {
                let result = fns[0](x, y, t)
                for (let i = 1; i < fns.length; i++) {
                    const top = fns[i](x, y, t)
                    // Alpha composite: top over result
                    const a = top.a + result.a * (1 - top.a)
                    if (a === 0) continue
                    result = color(
                        (top.r * top.a + result.r * result.a * (1 - top.a)) / a,
                        (top.g * top.a + result.g * result.a * (1 - top.a)) / a,
                        (top.b * top.a + result.b * result.a * (1 - top.a)) / a,
                        a
                    )
                }
                return result
            }
        }
    })

    env.registerOp({
        name: 'stripes',
        params: [
            { name: 'colors', type: 'value' },
        ],
        fn: (colors: Value) => {
            if (!Array.isArray(colors)) throw new Error('stripes expects a list of colors')
            const cols = (colors as Value[]).map(v => parseColor(v as string))
            const n = cols.length
            return (x: number) => cols[Math.min(Math.floor(x * n), n - 1)]
        }
    })

    env.registerOp({
        name: 'palette',
        params: [
            { name: 'colors', type: 'value' },
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (colors: Value, input: Value) => {
            if (!Array.isArray(colors)) throw new Error('palette expects a list of colors')
            const cols = (colors as Value[]).map(v => parseColor(v as string))
            const n = cols.length
            const fnInput = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const v = fnInput(x, y, t)
                const luma = 0.299 * v.r + 0.587 * v.g + 0.114 * v.b
                const idx = Math.min(Math.floor(luma * n), n - 1)
                return cols[idx]
            }
        }
    })

    env.registerOp({
        name: 'mix',
        params: [
            { name: 'inputs', type: 'value' },
        ],
        fn: (inputs: Value) => {
            if (!Array.isArray(inputs)) throw new Error('mix expects a list of images')
            const fns = (inputs as Value[]).map(toPixelFn)
            const n = fns.length
            return (x: number, y: number, t: number) => {
                let r = 0, g = 0, b = 0, a = 0
                for (const fn of fns) {
                    const c = fn(x, y, t)
                    r += c.r; g += c.g; b += c.b; a += c.a
                }
                return color(r / n, g / n, b / n, a / n)
            }
        }
    })

    // Convert coords to polar at center (0.5, 0.5), then feed to input function
    env.registerOp({
        name: 'polar',
        params: [
            { name: 'input', type: 'pixelfn' },
        ],
        fn: (input: Value) => {
            const src = toPixelFn(input)
            return (x: number, y: number, t: number) => {
                const cx = x - 0.5, cy = y - 0.5
                const r = Math.sqrt(cx * cx + cy * cy)
                const theta = Math.atan2(cy, cx) / (2 * Math.PI) + 0.5
                return src(theta, r, t)
            }
        }
    })
}