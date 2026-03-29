import type { PixelFn } from "../interpreter/types"

export function render(fn: PixelFn, width: number, height: number, t: number = 0): ImageData {
    const data = new ImageData(width, height)
    const buf = data.data

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const x = px / width
            const y = py / height
            const color = fn(x, y, t)
            const i = (py * width + px) * 4
            buf[i] = Math.floor(color.r * 255) & 0xFF
            buf[i + 1] = Math.floor(color.g * 255) & 0xFF
            buf[i + 2] = Math.floor(color.b * 255) & 0xFF
            buf[i + 3] = Math.floor(color.a * 255) & 0xFF
        }
    }

    return data
}