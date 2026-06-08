#!/usr/bin/env node
/**
 * alLang CLI — 实现 cli.md 规范
 *
 * 用法:
 *   allang --help                          输出帮助
 *   allang --compiler--file xxx.al --out xxx   编译单个文件
 *   allang --compiler--folder xxx --out xxx    编译文件夹
 *   allang --compiler--xxx xxx --base=paths --out xxx  带库编译
 *   allang --run xxx.albin                  运行编译后的文件
 */
import * as fs from 'fs'
import * as path from 'path'
import {fileURLToPath} from 'url'
import {segment, TokenStream} from 'allang-compiler-base'
import tokens from './tokens'
import {parse} from './parser'
import {checkWithResult} from './check/index'
import {desugar} from './desugar/index'
import {create} from './create/index'
import {command_data, head_alloc, instruction} from './create/types'
import {execSync, spawnSync} from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ========== 帮助信息 ==========

const HELP = `
alLang 编译器 — v0.0.1

用法:
  allang --help                              显示此帮助信息
  allang --compiler--file <file.al> --out <output>     编译单个 .al 文件
  allang --compiler--folder <dir> --out <output>       编译文件夹中所有 .al 文件
  allang --compiler--<file|folder> <path> --base=<libs> --out <output>
                                                        携带库文件编译
  allang --run <file.albin>                            运行编译后的 .albin 文件

示例:
  allang --compiler--file main.al --out main
  allang --compiler--folder src/ --out dist/program
  allang --compiler--file main.al --base=lib1.al;lib2.al --out main
  allang --run program.albin
`

// ========== 主入口 ==========

export async function main(args: string[]) {
    if (args.length === 0) {
        console.log(HELP)
        return
    }

    // 解析参数
    const parsed = parseArgs(args)

    if (parsed.help) {
        console.log(HELP)
        return
    }

    if (parsed.run) {
        await runAlbin(parsed.run)
        return
    }

    if (parsed.compile) {
        await compile(parsed)
        return
    }

    // 没有匹配的命令
    console.log(HELP)
}

// ========== 参数解析 ==========

interface ParsedArgs {
    help: boolean
    compile: { type: 'file' | 'folder', target: string } | null
    run: string | null
    base: string[]
    out: string | null
}

function parseArgs(args: string[]): ParsedArgs {
    const result: ParsedArgs = {
        help: false,
        compile: null,
        run: null,
        base: [],
        out: null,
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg === '--help' || arg === '-h') {
            result.help = true
        } else if (arg.startsWith('--compiler--file')) {
            const target = arg.includes('=') ? arg.split('=')[1] : args[++i]
            result.compile = { type: 'file', target }
        } else if (arg.startsWith('--compiler--folder')) {
            const target = arg.includes('=') ? arg.split('=')[1] : args[++i]
            result.compile = { type: 'folder', target }
        } else if (arg.startsWith('--compiler--')) {
            // --compiler--<file|folder> <path>
            const rest = arg.replace('--compiler--', '')
            if (rest.startsWith('file')) {
                const target = rest.includes('=') ? rest.split('=')[1] : (rest === 'file' ? args[++i] : rest.replace('file', ''))
                result.compile = { type: 'file', target: target || args[++i] }
            } else if (rest.startsWith('folder')) {
                const target = rest.includes('=') ? rest.split('=')[1] : (rest === 'folder' ? args[++i] : rest.replace('folder', ''))
                result.compile = { type: 'folder', target: target || args[++i] }
            } else {
                result.compile = { type: 'file', target: rest || args[++i] }
            }
        } else if (arg.startsWith('--base=')) {
            result.base = arg.replace('--base=', '').split(';').filter(Boolean)
        } else if (arg === '--out') {
            result.out = args[++i] || null
        } else if (arg.startsWith('--out=')) {
            result.out = arg.replace('--out=', '')
        } else if (arg === '--run') {
            result.run = args[++i] || null
        }
    }

    return result
}

// ========== 编译 ==========

async function compile(args: ParsedArgs) {
    try {
        // 收集源文件
        let sourceFiles: string[] = []

        if (args.compile!.type === 'file') {
            sourceFiles.push(args.compile!.target)
        } else if (args.compile!.type === 'folder') {
            const dir = args.compile!.target
            const entries = fs.readdirSync(dir, { recursive: true })
            for (const entry of entries) {
                if (entry.toString().endsWith('.al')) {
                    sourceFiles.push(path.join(dir, entry.toString()))
                }
            }
            if (sourceFiles.length === 0) {
                console.error(`错误: 在文件夹 '${dir}' 中未找到 .al 文件`)
                process.exit(1)
            }
        }

        // 自动包含 base 标准库文件夹 (compiler/base/*.al)
        const baseDir = path.join(__dirname, '..', 'base')
        if (fs.existsSync(baseDir)) {
            const baseEntries = fs.readdirSync(baseDir)
            for (const entry of baseEntries) {
                if (entry.endsWith('.al')) {
                    const fullPath = path.join(baseDir, entry)
                    // 避免重复添加
                    if (!sourceFiles.includes(fullPath)) {
                        sourceFiles.push(fullPath)
                    }
                }
            }
            if (baseEntries.some(e => e.endsWith('.al'))) {
                console.log(`自动包含 ${baseEntries.filter(e => e.endsWith('.al')).length} 个标准库文件`)
            }
        }

        // 添加手动指定的 base 库文件
        for (const libPath of args.base) {
            if (fs.existsSync(libPath)) {
                if (!sourceFiles.includes(libPath)) {
                    sourceFiles.push(libPath)
                }
            } else {
                console.warn(`警告: 库文件 '${libPath}' 不存在，跳过`)
            }
        }

        console.log(`编译 ${sourceFiles.length} 个文件...`)

        // 读取并解析每个文件
        const files = sourceFiles.map(filePath => {
            const code = fs.readFileSync(filePath, 'utf-8')
            const seg = new segment(code, tokens)
            const ts = new TokenStream(seg.segment())
            return parse(ts)
        })

        // Check
        const checkResult = checkWithResult(files)
        if (checkResult.hasErrors()) {
            console.error('编译失败: 存在错误')
            process.exit(1)
        }

        // Desugar
        const desugared = desugar(files)

        // Create (生成 ALVM 字节码)
        const bytecode = create(desugared)

        // 序列化为 .albin
        const albinCode = serializeAlbin(bytecode)

        // 输出文件
        const outName = (args.out || 'output') + '.albin'
        fs.writeFileSync(outName, albinCode, 'utf-8')
        console.log(`编译成功: ${outName}`)

    } catch (e: any) {
        console.error(`编译错误: ${e.message}`)
        process.exit(1)
    }
}

// ========== .albin 序列化 ==========

export function serializeAlbin(data: command_data): string {
    const lines: string[] = []

    // HEAD
    lines.push('HEAD_START')
    for (const alloc of data.HEAD) {
        lines.push(`@${alloc.type} ${alloc.start}~${alloc.end}`)
    }
    lines.push('HEAD_END')

    // BODY
    lines.push('BODY_START')
    for (const [blockName, instructions] of Object.entries(data.BODY)) {
        lines.push(`${blockName}:`)
        for (const inst of instructions) {
            lines.push('    ' + inst.join(' '))
        }
    }
    lines.push('BODY_END')

    return lines.join('\n')
}

// ========== .albin 反序列化 ==========

export function deserializeAlbin(code: string): command_data {
    const data = new command_data()
    const lines = code.split('\n').map(l => l.trim())

    let inHead = false
    let inBody = false
    let currentBlock: string | null = null

    for (const line of lines) {
        if (line === 'HEAD_START') { inHead = true; continue }
        if (line === 'HEAD_END') { inHead = false; continue }
        if (line === 'BODY_START') { inBody = true; continue }
        if (line === 'BODY_END') { inBody = false; continue }

        if (inHead && line.startsWith('@')) {
            const match = line.match(/@(\w+)\s+(\d+)~(\d+)/)
            if (match) {
                data.HEAD.push({
                    type: match[1] as any,
                    start: parseInt(match[2]),
                    end: parseInt(match[3])
                })
            }
        }

        if (inBody && line.endsWith(':')) {
            currentBlock = line.slice(0, -1)
            data.BODY[currentBlock] = []
        } else if (inBody && currentBlock && line.length > 0) {
            const inst = line.trim().split(/\s+/)
            if (inst.length > 0 && inst[0] !== '') {
                data.BODY[currentBlock].push(inst)
            }
        }
    }

    return data
}

// ========== 运行 .albin ==========

async function runAlbin(filePath: string) {
    if (!fs.existsSync(filePath)) {
        console.error(`错误: 文件 '${filePath}' 不存在`)
        process.exit(1)
    }

    // 尝试使用内置 Node.js VM 运行
    const code = fs.readFileSync(filePath, 'utf-8')
    const data = deserializeAlbin(code)

    console.log(`运行 ${filePath}...`)
    console.log(`HEAD: ${data.HEAD.length} 条分配记录`)
    console.log(`BODY: ${Object.keys(data.BODY).length} 个块`)

    // 尝试使用 C++ VM
    const vmPath = path.join(path.dirname(filePath), '..', 'vm', 'main.exe')
    if (fs.existsSync(vmPath)) {
        console.log(`使用 VM: ${vmPath}`)
        try {
            const result = spawnSync(vmPath, ['--run', filePath], {
                stdio: 'inherit',
                cwd: process.cwd()
            })
            if (result.error) throw result.error
        } catch (e: any) {
            console.error(`VM 执行失败: ${e.message}`)
            console.log('回退到内置解释器...')
            runBuiltinVM(data)
        }
    } else {
        console.log('C++ VM 未找到，使用内置解释器...')
        runBuiltinVM(data)
    }
}

// ========== 内置 VM (Node.js) ==========

function runBuiltinVM(data: command_data) {
    // 初始化存储
    const vars: Map<number, any> = new Map()
    const stacks: Map<string, any[]> = new Map()
    let retValue: any = null
    let pc = 0
    let currentBlock: string = '@main'
    let callStack: { block: string, pc: number }[] = []

    // 预分配变量
    for (const alloc of data.HEAD) {
        for (let i = alloc.start; i <= alloc.end; i++) {
            vars.set(i, null)
        }
    }

    function execute(blockName: string) {
        const instructions = data.BODY[blockName]
        if (!instructions) {
            console.error(`错误: 块 '${blockName}' 不存在`)
            return
        }

        for (let i = 0; i < instructions.length; i++) {
            const inst = instructions[i]
            const op = inst[0]

            switch (op) {
                case 'mov': {
                    const dest = inst[1]
                    const src = inst[2]
                    const destId = resolveId(dest)
                    const value = resolveValue(src)
                    vars.set(destId, value)
                    break
                }
                case 'add': {
                    const id = resolveId(inst[1])
                    const val = resolveValue(inst[2])
                    vars.set(id, (vars.get(id) || 0) + val)
                    break
                }
                case 'sub': {
                    const id = resolveId(inst[1])
                    const val = resolveValue(inst[2])
                    vars.set(id, (vars.get(id) || 0) - val)
                    break
                }
                case 'mul': {
                    const id = resolveId(inst[1])
                    const val = resolveValue(inst[2])
                    vars.set(id, (vars.get(id) || 0) * val)
                    break
                }
                case 'div': {
                    const id = resolveId(inst[1])
                    const val = resolveValue(inst[2])
                    vars.set(id, (vars.get(id) || 0) / val)
                    break
                }
                case 'call': {
                    const target = inst[1]
                    callStack.push({ block: blockName, pc: i })
                    execute(target)
                    const frame = callStack.pop()!
                    blockName = frame.block
                    i = frame.pc
                    break
                }
                case 'ret': {
                    return
                }
                case 'cmp': {
                    const left = resolveValue(inst[1])
                    const right = resolveValue(inst[2])
                    const op2 = inst[3]
                    const boolId = resolveId(inst[4])
                    let result = false
                    switch (op2) {
                        case '==': result = left === right; break
                        case '!=': result = left !== right; break
                        case '<': result = left < right; break
                        case '<=': result = left <= right; break
                        case '>': result = left > right; break
                        case '>=': result = left >= right; break
                    }
                    vars.set(boolId, result)
                    break
                }
                case 'cz': {
                    const boolId = resolveId(inst[1])
                    const label = inst[2]
                    if (!vars.get(boolId)) {
                        // 跳转到标签
                        const targetInst = instructions.findIndex(
                            (_, idx) => idx > i && data.BODY[blockName]?.[idx]?.[0] === '@' + label
                        )
                        // 简化：查找标签
                        for (let j = i + 1; j < instructions.length; j++) {
                            if (instructions[j][0] === '@' + label + ':') {
                                i = j
                                break
                            }
                        }
                    }
                    break
                }
                case 'push': {
                    const stackName = inst[1]
                    const value = resolveValue(inst[2])
                    if (!stacks.has(stackName)) stacks.set(stackName, [])
                    stacks.get(stackName)!.push(value)
                    break
                }
                case 'pop': {
                    const stackName = inst[1]
                    const stack = stacks.get(stackName)
                    if (stack && stack.length > 0) {
                        const val = stack.pop()
                        if (inst.length > 2) {
                            vars.set(resolveId(inst[2]), val)
                        }
                    }
                    break
                }
                case 'vm': {
                    const cmd = inst[1]
                    handleVmCommand(cmd)
                    break
                }
                case 'thread': {
                    // 简化：等同于 call
                    const target = inst[1]
                    execute(target)
                    break
                }
                default: {
                    if (op.startsWith('@') && op.endsWith(':')) {
                        // 标签，跳过
                    }
                    break
                }
            }
        }
    }

    function resolveId(s: string): number {
        if (s === 'ret') return -1
        const num = parseInt(s)
        if (!isNaN(num)) return num
        // 变量名 → ID 查找
        for (const [id, val] of vars) {
            // 简化：直接尝试解析
        }
        return parseInt(s) || 0
    }

    function resolveValue(s: string): any {
        if (s === 'null') return null
        if (s === 'true') return true
        if (s === 'false') return false
        if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1)
        const num = parseFloat(s)
        if (!isNaN(num)) return num
        // 变量引用 [id]
        if (s.startsWith('[') && s.endsWith(']')) {
            const id = parseInt(s.slice(1, -1))
            return vars.get(id)
        }
        return s
    }

    function handleVmCommand(cmd: string) {
        // 处理 vm 内联指令
        cmd = cmd.replace(/['"]/g, '') // 移除引号
        if (cmd === 'gc' || cmd === 'GC') {
            // GC 操作
            return
        }
        if (cmd.startsWith('out ') || cmd.startsWith('OUT ')) {
            const value = cmd.substring(4).trim()
            console.log(resolveValue(value))
            return
        }
        if (cmd.startsWith('in ') || cmd.startsWith('IN ')) {
            // IN 操作需要交互式输入，暂不支持
            return
        }
        // 其他 vm 命令原样输出
        console.log(`[vm] ${cmd}`)
    }

    // 执行主块
    if (data.BODY['@main']) {
        execute('@main')
    } else {
        // 尝试找到第一个块并执行
        const blocks = Object.keys(data.BODY)
        if (blocks.length > 0) {
            execute(blocks[0])
        }
    }
}

// ========== CLI 入口 ==========

// 仅当直接运行时才执行 CLI
if (process.argv[1] === __filename) {
    const args = process.argv.slice(2)
    main(args).catch(e => {
        console.error('致命错误:', e.message)
        process.exit(1)
    })
}
