/**
 * alvm 字节码类型定义 — 实现 create.md 中的 HEAD/BODY 格式
 */

// HEAD 中的存储块类型
export type VarKind = 'STRING_VAR' | 'NUMBER_VAR' | 'BOOLEAN_VAR'
    | 'STRING_STACK' | 'NUMBER_STACK' | 'BOOLEAN_STACK'

// HEAD 中的一条分配记录: @TYPE start~end
export interface head_alloc {
    type: VarKind
    start: number
    end: number
}

// 一条 ALVM 指令 — 每个元素是一个 token
// 例如: ['mov', 'string_var', "'hello'"]
//       ['add', 'num_var', '10']
//       ['call', 'block_main']
export type instruction = string[]

// 一个块包含一个指令序列
export type block = instruction[]

// BODY 是一个以块名为索引的映射
export interface body_map {
    [blockName: string]: block
}

// command_data — 代码生成的最终输出
export class command_data {
    HEAD: head_alloc[]
    BODY: body_map

    constructor() {
        this.HEAD = []
        this.BODY = {}
    }
}

// ========== 内部使用的变量分配器 ==========

export class VarAllocator {
    private nextId: { [kind: string]: number } = {}
    private baseId: { [kind: string]: number } = {}
    private counts: { [kind: string]: number } = {}
    private varMap: Map<string, { id: number, kind: VarKind }> = new Map()

    constructor() {
        // 初始化每种类型的起始 ID
        this.nextId['STRING_VAR'] = 0
        this.nextId['NUMBER_VAR'] = 0
        this.nextId['BOOLEAN_VAR'] = 0
        this.nextId['STRING_STACK'] = 0
        this.nextId['NUMBER_STACK'] = 0
        this.nextId['BOOLEAN_STACK'] = 0
    }

    // 分配一个新变量
    alloc(name: string, kind: VarKind): number {
        const id = this.nextId[kind]++
        this.counts[kind] = (this.counts[kind] || 0) + 1
        this.varMap.set(name, { id, kind })
        return id
    }

    // 获取已分配变量的 ID
    getVar(name: string): { id: number, kind: VarKind } | null {
        return this.varMap.get(name) || null
    }

    // 获取变量的引用格式 [id]
    getRef(name: string): string {
        const v = this.varMap.get(name)
        if (v) return `[${v.id}]`
        return name // fallback: use name directly
    }

    // 获取变量的 ID 字符串
    getId(name: string): string {
        const v = this.varMap.get(name)
        if (v) return `${v.id}`
        return name
    }

    // 生成 HEAD 条目列表
    toHeadAllocs(): head_alloc[] {
        const result: head_alloc[] = []
        for (const kind of ['STRING_VAR', 'NUMBER_VAR', 'BOOLEAN_VAR',
            'STRING_STACK', 'NUMBER_STACK', 'BOOLEAN_STACK'] as VarKind[]) {
            const count = this.counts[kind]
            if (count && count > 0) {
                const base = this.baseId[kind] || 0
                result.push({ type: kind, start: base, end: base + count - 1 })
            }
        }
        return result
    }

    // 固定每种类型的起始 ID（便于跨块引用）
    setBase(kind: VarKind, base: number) {
        this.baseId[kind] = base
        this.nextId[kind] = base
    }
}

// ========== 辅助：生成唯一数字标签 ==========
let _labelCounter = 0
export function uniqueLabel(prefix: string = 'L'): string {
    return `_${prefix}${(_labelCounter++).toString(36)}`
}
export function resetLabelCounter() { _labelCounter = 0 }
