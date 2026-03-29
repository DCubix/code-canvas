import type { OperatorDef, Value } from "./types";

export class Environment {
    private vars: Map<string, Value>
    private ops: Map<string, OperatorDef>
    private parent: Environment | null

    constructor(parent: Environment | null = null) {
        this.vars = new Map()
        this.ops = new Map()
        this.parent = parent
    }

    getVar(name: string): Value | undefined {
        return this.vars.get(name) ?? this.parent?.getVar(name)
    }

    setVar(name: string, value: Value): void {
        this.vars.set(name, value)
    }

    getOp(name: string): OperatorDef | undefined {
        return this.ops.get(name) ?? this.parent?.getOp(name)
    }

    registerOp(def: OperatorDef): void {
        this.ops.set(def.name, def)
    }

    child(): Environment {
        return new Environment(this)
    }
}