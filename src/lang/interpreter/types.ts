export type Color = {
    r: number
    g: number
    b: number
    a: number
}

export function color(r: number, g: number, b: number, a: number = 1): Color {
    return { r, g, b, a }
}

export function colorShade(v: number): Color {
    return { r: v, g: v, b: v, a: 1 }
}

export type PixelFn = (x: number, y: number, t: number) => Color

export type Value = number | string | Color | PixelFn | Value[]

export interface ParamDef {
    name: string
    type: 'pixelfn' | 'color' | 'number' | 'string' | 'value'
}

export interface OperatorDef {
    name: string
    params: ParamDef[]
    fn: (...args: Value[]) => Value
}