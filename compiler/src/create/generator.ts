/**
 * ALVM 代码生成器 — 将 desugar 后的 file_tree 转换为 command_data
 */
import {
    file_tree, space_tree, func_tree, class_tree, interface_tree,
    module_tree, var_tree, const_tree, enum_tree
} from '../tree'
import {
    command_tree, if_tree, while_tree, for_tree, switch_tree,
    foreach_tree, try_tree, return_tree, break_tree, continue_tree,
    throw_tree, identifier_var_tree, set_tree, math_set_tree,
    call_tree, delete_tree, vm_tree, block_tree
} from '../tree'
import {
    get_tree, get_node_tree, chain_get_tree, variable_get_tree,
    call_get_tree as call_get_expr, array_get_tree, map_get_tree,
    pointer_get_tree, math_oper_get_tree, bool_oper_get_tree,
    ternary_get_tree, lambda_get_tree, lambda_call_get_tree,
    new_get_tree, number_get_tree, string_get_tree,
    boolean_get_tree, null_get_tree, instanceof_get_tree,
    typeof_get_tree, array_data_get_tree
} from '../tree'
import {
    identifier_tree, type_tree, basic_type_tree, array_type_tree,
    lambda_type_tree, map_type_tree, class_type_tree
} from '../tree'
import {param_call_tree, param_identifier_tree} from '../tree'
import {basic_type, math_oper_type, bool_oper_type, pointer_type} from '../model'
import {
    command_data, head_alloc, instruction, block, body_map,
    VarAllocator, VarKind, uniqueLabel, resetLabelCounter
} from './types'

// ========== 主入口 ==========

export function generate(file: file_tree): command_data {
    resetLabelCounter()
    const data = new command_data()
    const allocator = new VarAllocator()

    // 预分配常见变量类型的基础 ID 范围
    allocator.setBase('STRING_VAR', 0)
    allocator.setBase('NUMBER_VAR', 100)
    allocator.setBase('BOOLEAN_VAR', 200)
    allocator.setBase('STRING_STACK', 300)
    allocator.setBase('NUMBER_STACK', 400)
    allocator.setBase('BOOLEAN_STACK', 500)

    const ctx = new GenContext(allocator, data)

    // Step 1: 收集所有声明变量
    ctx.collectVars(file.spaces, '')

    // Step 2: 生成顶层初始化块（可能分配 temp 变量）
    const initBlock = ctx.genTopLevel(file.spaces)

    // Step 3: 生成所有函数块（分配更多 temp 变量）
    ctx.genFunctions(file.spaces)

    // Step 4: 在所有代码生成后生成 HEAD（包含 temp 变量）
    data.HEAD = allocator.toHeadAllocs()

    // Step 5: 设置入口块: 优先查找 main 函数, 否则使用 init
    const mainBlockName = ctx.findMainBlock()
    if (mainBlockName && data.BODY[mainBlockName]) {
        // 将 main 函数的块重命名为 @main
        const mainBody = data.BODY[mainBlockName]
        delete data.BODY[mainBlockName]
        // 前置 init 代码
        const entryBlock: block = []
        for (const inst of initBlock) entryBlock.push(inst)
        for (const inst of mainBody) entryBlock.push(inst)
        data.BODY['@main'] = entryBlock
    } else if (initBlock.length > 0) {
        data.BODY['@main'] = initBlock
    }

    return data
}

// ========== 生成上下文 ==========

class GenContext {
    allocator: VarAllocator
    data: command_data
    funcBlocks: Map<string, func_tree> = new Map()
    currentBlock: string = '@main'
    currentPrefix: string = ''

    constructor(allocator: VarAllocator, data: command_data) {
        this.allocator = allocator
        this.data = data
    }

    // 查找 main 函数对应的块名
    findMainBlock(): string | null {
        for (const [fullName, func] of this.funcBlocks) {
            const simpleName = fullName.split('.').pop()
            if (simpleName === 'main') {
                return '@' + fullName
            }
        }
        return null
    }

    // 获取变量的数字ID (使用路径前缀，支持作用域链查找)
    resolveId(name: string): string {
        // 尝试完整路径 (currentPrefix.name)
        if (this.currentPrefix) {
            const fullName = this.currentPrefix + '.' + name
            const v = this.allocator.getVar(fullName)
            if (v) return `${v.id}`
        }
        // 尝试回退: 从 currentPrefix 逐级缩短 (上溯作用域)
        if (this.currentPrefix) {
            let prefix = this.currentPrefix
            while (prefix.includes('.')) {
                prefix = prefix.substring(0, prefix.lastIndexOf('.'))
                const fullName = prefix + '.' + name
                const v = this.allocator.getVar(fullName)
                if (v) return `${v.id}`
            }
        }
        // 尝试仅用裸名称 (全局变量)
        const v2 = this.allocator.getVar(name)
        if (v2) return `${v2.id}`
        return name // 最终回退
    }

    // ========== 变量收集 ==========

    collectVars(spaces: space_tree[], prefix: string) {
        for (const space of spaces) {
            const name = prefix ? prefix + '.' + space.name : space.name
            if (space instanceof var_tree) {
                const kind = this.typeToVarKind(space.var_type)
                this.allocator.alloc(name, kind)
            } else if (space instanceof const_tree) {
                const kind = this.typeToVarKind(space.const_type)
                this.allocator.alloc(name, kind)
            } else if (space instanceof func_tree) {
                this.funcBlocks.set(name, space)
                // 收集参数变量
                if (space.params && space.params.param) {
                    for (const p of space.params.param) {
                        const kind = this.typeToVarKind(p.value)
                        this.allocator.alloc(name + '.' + p.key, kind)
                    }
                }
                // 收集函数体内的局部变量
                if (space.commands) {
                    this.collectCmdVars(space.commands)
                }
            } else if (space instanceof module_tree || space instanceof class_tree) {
                if (space.children) this.collectVars(space.children, name)
            }
        }
    }

    collectCmdVars(commands: command_tree[]) {
        for (const cmd of commands) {
            if (cmd instanceof identifier_var_tree) {
                const kind = this.typeToVarKind(cmd.identifier.value)
                this.allocator.alloc(cmd.identifier.key, kind)
            }
            // 递归收集子命令中的变量
            if (cmd.commands) this.collectCmdVars(cmd.commands)
            if (cmd instanceof if_tree) {
                if (cmd.else) this.collectCmdVars(cmd.else)
                for (const ei of cmd.else_if) {
                    if (ei.commands) this.collectCmdVars(ei.commands)
                }
            }
            if (cmd instanceof while_tree && cmd.commands) {
                this.collectCmdVars(cmd.commands)
            }
        }
    }

    typeToVarKind(tp: type_tree): VarKind {
        if (tp instanceof basic_type_tree) {
            switch (tp.type_name) {
                case basic_type.string: return 'STRING_VAR'
                case basic_type.number: return 'NUMBER_VAR'
                case basic_type.boolean: return 'BOOLEAN_VAR'
                default: return 'NUMBER_VAR'
            }
        }
        return 'NUMBER_VAR'
    }

    // ========== 顶层初始化代码 ==========

    genTopLevel(spaces: space_tree[]): block {
        const result: block = []
        for (const space of spaces) {
            this.genSpaceInit(space, result)
        }
        return result
    }

    genSpaceInit(space: space_tree, out: block, prefix: string = '') {
        const savedPrefix = this.currentPrefix
        // prefix 是父路径 (不包含当前 space 的名字)
        this.currentPrefix = prefix

        if (space instanceof var_tree) {
            const id = this.resolveId(space.name)
            if (space.value) {
                const val = this.emitExpr(space.value, out)
                out.push(['mov', id, val])
            } else {
                out.push(['mov', id, 'null'])
            }
        } else if (space instanceof const_tree) {
            const id = this.resolveId(space.name)
            if (space.value) {
                const val = this.emitExpr(space.value, out)
                out.push(['mov', id, val])
            }
        } else if (space instanceof func_tree) {
            // 函数在 genFunctions 中处理
        } else if (space instanceof class_tree) {
            // 类已转换为构造函数，由 genFunctions 处理
        } else if (space instanceof module_tree) {
            const childPrefix = prefix ? prefix + '.' + space.name : space.name
            if (space.children) {
                for (const child of space.children) {
                    this.genSpaceInit(child, out, childPrefix)
                }
            }
        }

        this.currentPrefix = savedPrefix
    }

    // ========== 函数生成 ==========

    genFunctions(spaces: space_tree[], prefix: string = '') {
        for (const space of spaces) {
            const name = prefix ? prefix + '.' + space.name : space.name
            if (space instanceof func_tree) {
                this.genFunction(space, name)
            } else if (space instanceof module_tree || space instanceof class_tree) {
                if (space.children) this.genFunctions(space.children, name)
            }
        }
    }

    genFunction(func: func_tree, fullName: string) {
        const blockName = '@' + fullName
        this.currentBlock = blockName
        const savedPrefix = this.currentPrefix
        this.currentPrefix = fullName  // 函数参数用 fullName.paramKey 查找
        const body: block = []

        if (func.commands) {
            this.genCommands(func.commands, body)
        }

        // 如果没有显式 return，添加隐式 ret
        if (body.length === 0 || body[body.length - 1][0] !== 'ret') {
            body.push(['ret'])
        }

        this.data.BODY[blockName] = body
        this.currentBlock = '@main'
        this.currentPrefix = savedPrefix
    }

    // ========== 命令生成 ==========

    genCommands(commands: command_tree[], out: block) {
        for (const cmd of commands) {
            this.genCommand(cmd, out)
        }
    }

    genCommand(cmd: command_tree, out: block) {
        if (!cmd) return

        if (cmd instanceof identifier_var_tree) {
            this.genVarDecl(cmd, out)
        } else if (cmd instanceof math_set_tree) {
            this.genMathSet(cmd, out)
        } else if (cmd instanceof set_tree) {
            this.genSet(cmd, out)
        } else if (cmd instanceof call_tree) {
            this.genCall(cmd, out)
        } else if (cmd instanceof return_tree) {
            this.genReturn(cmd, out)
        } else if (cmd instanceof if_tree) {
            this.genIf(cmd, out)
        } else if (cmd instanceof while_tree) {
            this.genWhile(cmd, out)
        } else if (cmd instanceof break_tree) {
            out.push(['call', this.breakLabel()])
        } else if (cmd instanceof continue_tree) {
            out.push(['call', this.continueLabel()])
        } else if (cmd instanceof throw_tree) {
            this.genThrow(cmd, out)
        } else if (cmd instanceof delete_tree) {
            out.push(['mov', this.resolveId(cmd.name), 'null'])
        } else if (cmd instanceof vm_tree) {
            this.genVm(cmd, out)
        } else if (cmd instanceof switch_tree) {
            this.genSwitch(cmd, out)
        } else if (cmd instanceof try_tree) {
            this.genTry(cmd, out)
        } else if (cmd instanceof block_tree) {
            if (cmd.commands) this.genCommands(cmd.commands, out)
        } else if (cmd instanceof for_tree) {
            // for 在 desugar 后应该已被展开，但保留处理
            if (cmd.body) this.genCommands(cmd.body, out)
        } else if (cmd instanceof foreach_tree) {
            // foreach 在 desugar 后应该已被展开
            if (cmd.commands) this.genCommands(cmd.commands, out)
        } else if (cmd.commands) {
            this.genCommands(cmd.commands, out)
        }
    }

    // --- var 声明 ---
    genVarDecl(cmd: identifier_var_tree, out: block) {
        const id = this.resolveId(cmd.identifier.key)
        if (cmd.value) {
            const val = this.emitExpr(cmd.value, out)
            out.push(['mov', id, val])
        } else {
            out.push(['mov', id, 'null'])
        }
    }

    // --- 赋值 ---
    genSet(cmd: set_tree, out: block) {
        const id = this.resolveId(cmd.name)
        if (cmd.value) {
            const val = this.emitExpr(cmd.value, out)
            out.push(['mov', id, val])
        }
    }

    // --- 复合赋值 += -= 等 ---
    genMathSet(cmd: math_set_tree, out: block) {
        const id = this.resolveId(cmd.name)
        if (cmd.value) {
            const val = this.emitExpr(cmd.value, out)
            const op = this.mathOperToAlvm(cmd.oper_type)
            out.push([op, id, val])
        }
    }

    mathOperToAlvm(oper: math_oper_type): string {
        switch (oper) {
            case math_oper_type.add: return 'add'
            case math_oper_type.sub: return 'sub'
            case math_oper_type.mul: return 'mul'
            case math_oper_type.div: return 'div'
            case math_oper_type.mod: return 'mod'
            case math_oper_type.and: return 'and'
            case math_oper_type.or: return 'or'
            case math_oper_type.xor: return 'xor'
            default: return 'add'
        }
    }

    // --- 函数调用 ---
    genCall(cmd: call_tree, out: block) {
        const fullName = this.resolveFuncName(cmd.name)
        const blockName = '@' + fullName
        // 如果有参数，push 到栈
        if (cmd.param && cmd.param.args) {
            for (const arg of cmd.param.args) {
                const val = this.emitExpr(arg, out)
                out.push(['push', 'number_stack', val])
            }
        }
        if (cmd._await) {
            out.push(['thread', blockName])
        } else {
            out.push(['call', blockName])
        }
    }

    // 解析函数名为完整路径
    resolveFuncName(name: string): string {
        // 如果已经是完整路径（包含点），直接返回
        if (name.includes('.')) return name
        // 在 funcBlocks 中查找
        for (const [fullName, func] of this.funcBlocks) {
            const simpleName = fullName.split('.').pop()
            if (simpleName === name) return fullName
        }
        return name
    }

    // --- return ---
    genReturn(cmd: return_tree, out: block) {
        if (cmd.value) {
            const val = this.emitExpr(cmd.value, out)
            out.push(['mov', 'ret', val])
        }
        out.push(['ret'])
    }

    // --- if-else ---
    genIf(cmd: if_tree, out: block) {
        const endLabel = uniqueLabel('endif')
        const elseLabel = cmd.else && cmd.else.length > 0 ? uniqueLabel('else') : endLabel

        // 生成条件
        this.genCondition(cmd.condition, elseLabel, out)

        // body
        if (cmd.commands) this.genCommands(cmd.commands, out)

        // else-if 链
        for (const ei of cmd.else_if) {
            out.push(['call', endLabel])
            out.push(['@' + elseLabel + ':']) // fallthrough from previous
            const nextElseLabel = uniqueLabel('elseif')
            this.genCondition(ei.condition, nextElseLabel, out)
            if (ei.commands) this.genCommands(ei.commands, out)
        }

        // else
        if (cmd.else && cmd.else.length > 0) {
            out.push(['call', endLabel])
            out.push(['@' + elseLabel + ':'])
            this.genCommands(cmd.else, out)
        }

        out.push(['@' + endLabel + ':'])
    }

    genCondition(cond: get_node_tree, falseLabel: string, out: block) {
        // 评估条件表达式，如果为 false 跳转到 falseLabel
        if (!cond || !cond.tree) return

        const first = cond.tree.chain[0]
        if (first instanceof bool_oper_get_tree) {
            // bool 运算：比较左和右
            const leftVal = first.left ? this.emitExpr(first.left, out) : 'null'
            const rightVal = first.right ? this.emitExpr(first.right, out) : 'null'
            const boolVar = this.allocBoolTemp()
            const cmpOp = this.boolOperToCmp(first.oper_type)
            out.push(['cmp', leftVal, rightVal, cmpOp, boolVar])
            out.push(['cz', boolVar, falseLabel])
        } else if (first instanceof variable_get_tree) {
            const id = this.resolveId(first.name)
            out.push(['cz', id, falseLabel])
        } else if (first instanceof boolean_get_tree) {
            if (!first.value) {
                out.push(['call', falseLabel])
            }
        } else {
            // 其他表达式：检查 != null
            const val = this.emitGetExpr(first, out)
            const boolVar = this.allocBoolTemp()
            out.push(['cmp', val, 'null', '!=', boolVar])
            out.push(['cz', boolVar, falseLabel])
        }
    }

    boolOperToCmp(oper: bool_oper_type): string {
        switch (oper) {
            case bool_oper_type.equal: return '=='
            case bool_oper_type.not_equal: return '!='
            case bool_oper_type.less: return '<'
            case bool_oper_type.less_equal: return '<='
            case bool_oper_type.greater: return '>'
            case bool_oper_type.greater_equal: return '>='
            case bool_oper_type.logic_and: return '&&'
            case bool_oper_type.logic_or: return '||'
            default: return '=='
        }
    }

    // --- while ---
    genWhile(cmd: while_tree, out: block) {
        const startLabel = uniqueLabel('while')
        const endLabel = uniqueLabel('wend')
        const bodyLabel = uniqueLabel('wbody')

        out.push(['@' + startLabel + ':'])

        // 生成条件
        if (cmd.condition && cmd.condition.tree) {
            this.genCondition(cmd.condition, endLabel, out)
        }

        // body
        out.push(['@' + bodyLabel + ':'])
        if (cmd.commands) {
            this.genCommands(cmd.commands, out)
        }

        out.push(['call', startLabel])
        out.push(['@' + endLabel + ':'])
    }

    // --- throw ---
    genThrow(cmd: throw_tree, out: block) {
        if (cmd.value) {
            const val = this.emitExpr(cmd.value, out)
            out.push(['throw', val])
        }
    }

    // --- vm 内联汇编 ---
    // vm 'xxx' 的字符串内容直接被当作 ALVM 指令发射
    // ${varName} 会被替换为变量数字ID
    genVm(cmd: vm_tree, out: block) {
        let value = cmd.value
        // 剥离外层引号
        if (value.length >= 2 && value[0] === "'" && value[value.length-1] === "'") {
            value = value.slice(1, -1)
        }
        // 替换 ${varName} 为变量数字ID
        value = value.replace(/\$\{(\w+)\}/g, (_, name: string) => {
            return this.resolveId(name)
        })
        // 按空格分割为指令，直接发射
        const parts = value.trim().split(/\s+/).filter(p => p.length > 0)
        if (parts.length > 0) {
            out.push(parts)
        }
    }

    resolveVmString(value: string): string {
        return value.replace(/\$\{(\w+)\}/g, (_, name) => {
            return this.allocator.getId(name)
        })
    }

    // --- switch ---
    genSwitch(cmd: switch_tree, out: block) {
        const endLabel = uniqueLabel('swend')

        if (cmd.condition && cmd.condition.tree) {
            const condVal = this.emitExpr(cmd.condition, out)

            for (const c of cmd.cases) {
                const caseLabel = uniqueLabel('scase')
                const nextLabel = uniqueLabel('snext')
                const caseVal = this.emitGetExprFromTree(c.value, out)
                const boolVar = this.allocBoolTemp()
                out.push(['cmp', condVal, caseVal, '==', boolVar])
                out.push(['cz', boolVar, caseLabel])
                out.push(['call', nextLabel])
                out.push(['@' + caseLabel + ':'])
                if (c.call) this.genCommands(c.call, out)
                out.push(['call', endLabel])
                out.push(['@' + nextLabel + ':'])
            }

            if (cmd.default && cmd.default.length > 0) {
                this.genCommands(cmd.default, out)
            }
        }

        out.push(['@' + endLabel + ':'])
    }

    // --- try-catch-finally ---
    genTry(cmd: try_tree, out: block) {
        const catchLabel = uniqueLabel('catch')
        const finallyLabel = uniqueLabel('finally')
        const endLabel = uniqueLabel('tryend')

        out.push(['try_start', catchLabel])
        if (cmd.commands) this.genCommands(cmd.commands, out)
        out.push(['try_end'])

        if (cmd.finally && cmd.finally.length > 0) {
            out.push(['call', finallyLabel])
        }
        out.push(['call', endLabel])

        out.push(['@' + catchLabel + ':'])
        if (cmd.catch && cmd.catch.body) {
            this.genCommands(cmd.catch.body, out)
        }

        if (cmd.finally && cmd.finally.length > 0) {
            out.push(['@' + finallyLabel + ':'])
            this.genCommands(cmd.finally, out)
        }

        out.push(['@' + endLabel + ':'])
    }

    // ========== 表达式求值 — 发射指令到 out，返回结果存储位置 ==========

    // 求值一个表达式（可能是 get_node_tree 或 get_tree），将指令发射到 out，返回结果 ID
    emitExpr(node: get_node_tree | get_tree, out: block): string {
        if (!node) return 'null'
        if (node instanceof get_node_tree) {
            if (!node.tree || !node.tree.chain || node.tree.chain.length === 0) return 'null'
            // 链中最后一个元素是最终值
            const chain = node.tree.chain
            let result = 'null'
            for (const elem of chain) {
                result = this.emitGetExpr(elem, out)
            }
            return result
        }
        // 直接是 get_tree
        return this.emitGetExpr(node, out)
    }

    // 求值单个 get_tree 节点，发射指令到 out
    emitGetExpr(get: get_tree, out: block): string {
        if (get instanceof variable_get_tree) {
            return this.resolveId(get.name)
        } else if (get instanceof number_get_tree) {
            return `${get.value}`
        } else if (get instanceof string_get_tree) {
            // get.value 已包含引号 (来自 token.name)，不要重复添加
            return get.value
        } else if (get instanceof boolean_get_tree) {
            return get.value ? 'true' : 'false'
        } else if (get instanceof null_get_tree) {
            return 'null'
        } else if (get instanceof pointer_get_tree) {
            return this.emitPointerExpr(get, out)
        } else if (get instanceof math_oper_get_tree) {
            return this.emitMathExpr(get, out)
        } else if (get instanceof bool_oper_get_tree) {
            return this.emitBoolExpr(get, out)
        } else if (get instanceof array_get_tree) {
            return this.emitArrayAccess(get, out)
        } else if (get instanceof call_get_expr) {
            return this.emitCallExpr(get, out)
        } else if (get instanceof chain_get_tree) {
            return this.emitChainExpr(get, out)
        } else if (get instanceof map_get_tree) {
            return this.emitMapLiteral(get, out)
        } else if (get instanceof ternary_get_tree) {
            return this.emitTernaryExpr(get, out)
        } else if (get instanceof lambda_get_tree) {
            const tempVar = this.allocNumTemp()
            out.push(['mov', tempVar, 'null'])
            return tempVar
        } else if (get instanceof new_get_tree) {
            return this.emitNewExpr(get, out)
        } else if (get instanceof instanceof_get_tree) {
            return this.emitInstanceofExpr(get, out)
        } else if (get instanceof typeof_get_tree) {
            return this.emitTypeofExpr(get, out)
        } else if (get instanceof array_data_get_tree) {
            return this.emitArrayDataExpr(get, out)
        }
        return 'null'
    }

    emitGetExprFromTree(get: get_tree, out: block): string {
        return this.emitGetExpr(get, out)
    }

    // --- 指针操作 ---
    emitPointerExpr(get: pointer_get_tree, out: block): string {
        if (get.oper_type === pointer_type.value) {
            // *a → [[id]] 解引用：读取指针指向的值
            if (get.data instanceof variable_get_tree) {
                const ptrId = this.resolveId(get.data.name)
                const tempVar = this.allocNumTemp()
                // mov temp [[ptrId]] — 双重解引用
                out.push(['mov', tempVar, `[${ptrId}]`])
                return tempVar
            }
        } else {
            // &a → 取地址：返回变量 ID 本身（指针值）
            if (get.data instanceof variable_get_tree) {
                return this.resolveId(get.data.name)
            }
        }
        return 'null'
    }

    // --- 算术运算 ---
    emitMathExpr(get: math_oper_get_tree, out: block): string {
        // left/right 可能是 get_node_tree (带 chain), 使用 emitExpr 处理
        const leftVal = get.left ? this.emitExpr(get.left, out) : '0'
        const rightVal = get.right ? this.emitExpr(get.right, out) : '0'
        const tempVar = this.allocNumTemp()
        const op = this.mathOperToAlvm(get.oper_type)
        // 先 mov tempVar leftVal, 再 op tempVar rightVal
        out.push(['mov', tempVar, leftVal])
        out.push([op, tempVar, rightVal])
        return tempVar
    }

    // --- 布尔运算 ---
    emitBoolExpr(get: bool_oper_get_tree, out: block): string {
        const boolVar = this.allocBoolTemp()
        // left/right 可能是 get_node_tree, 使用 emitExpr 处理
        const leftVal = get.left ? this.emitExpr(get.left, out) : 'null'
        const rightVal = get.right ? this.emitExpr(get.right, out) : 'null'
        const cmpOp = this.boolOperToCmp(get.oper_type)
        out.push(['cmp', leftVal, rightVal, cmpOp, boolVar])
        return boolVar
    }

    // --- 数组/映射下标访问 ---
    emitArrayAccess(get: array_get_tree, out: block): string {
        // 在 desugar 后，这应该已被转换为 Lang.Array.get / Lang.Map.get 调用
        // 但如果未被转换，生成下标访问指令
        const nameVal = get.name ? this.emitExpr(get.name, out) : 'null'
        const indexVal = get.index ? this.emitExpr(get.index, out) : '0'
        const tempVar = this.allocNumTemp()
        out.push(['mov', tempVar, `[${nameVal}]`])
        return tempVar
    }

    // --- 函数调用表达式 ---
    emitCallExpr(get: call_get_expr, out: block): string {
        // 解析函数名
        let funcName = ''
        if (get.name && get.name.tree && get.name.tree.chain.length > 0) {
            const first = get.name.tree.chain[0]
            if (first instanceof variable_get_tree) {
                funcName = first.name
            }
        }
        const fullName = this.resolveFuncName(funcName)
        const blockName = '@' + fullName

        // push 参数
        if (get.params && get.params.args) {
            for (const arg of get.params.args) {
                const argVal = this.emitExpr(arg, out)
                out.push(['push', 'number_stack', argVal])
            }
        }

        // call 函数
        out.push(['call', blockName])

        // 结果存到临时变量
        const tempVar = this.allocNumTemp()
        out.push(['mov', tempVar, 'ret'])
        return tempVar
    }

    // --- 链式表达式 a.b.c ---
    emitChainExpr(get: chain_get_tree, out: block): string {
        if (get.chain.length === 0) return 'null'
        // 对链中每个元素求值，最后一个的结果是最终值
        let result = 'null'
        for (const elem of get.chain) {
            result = this.emitGetExpr(elem, out)
        }
        return result
    }

    // --- 映射字面量 ---
    emitMapLiteral(get: map_get_tree, out: block): string {
        const tempVar = this.allocNumTemp()
        out.push(['mov', tempVar, 'null'])  // 简化：分配空 map
        return tempVar
    }

    // --- 三元运算符 ---
    emitTernaryExpr(get: ternary_get_tree, out: block): string {
        const tempVar = this.allocNumTemp()
        const elseLabel = uniqueLabel('ternelse')
        const endLabel = uniqueLabel('ternend')

        // 求值条件
        if (get.condition && get.condition.tree) {
            const first = get.condition.tree.chain[0]
            if (first instanceof bool_oper_get_tree) {
                const leftVal = first.left ? this.emitExpr(first.left, out) : 'null'
                const rightVal = first.right ? this.emitExpr(first.right, out) : 'null'
                const boolVar = this.allocBoolTemp()
                out.push(['cmp', leftVal, rightVal, this.boolOperToCmp(first.oper_type), boolVar])
                out.push(['cz', boolVar, elseLabel])
            } else if (first instanceof boolean_get_tree) {
                if (!first.value) out.push(['call', elseLabel])
            }
        }

        // true 值
        const trueVal = get.true_value ? this.emitExpr(get.true_value, out) : 'null'
        out.push(['mov', tempVar, trueVal])
        out.push(['call', endLabel])

        // else
        out.push(['@' + elseLabel + ':'])
        const falseVal = get.false_value ? this.emitExpr(get.false_value, out) : 'null'
        out.push(['mov', tempVar, falseVal])

        out.push(['@' + endLabel + ':'])
        return tempVar
    }

    // --- new 调用 ---
    emitNewExpr(get: new_get_tree, out: block): string {
        return this.emitCallExpr(get, out)
    }

    // --- instanceof ---
    emitInstanceofExpr(get: instanceof_get_tree, out: block): string {
        const boolVar = this.allocBoolTemp()
        out.push(['mov', boolVar, 'false'])
        return boolVar
    }

    // --- typeof ---
    emitTypeofExpr(get: typeof_get_tree, out: block): string {
        const tempVar = this.allocNumTemp()
        out.push(['mov', tempVar, 'null'])
        return tempVar
    }

    // --- 数组字面量 [1, 2, 3] ---
    emitArrayDataExpr(get: array_data_get_tree, out: block): string {
        const tempVar = this.allocNumTemp()
        out.push(['mov', tempVar, 'null'])
        return tempVar
    }

    // ========== 标签管理 ==========

    private _loopStack: string[] = []

    breakLabel(): string {
        // 返回跳出循环的标签
        return '_break_' + (this._loopStack.length > 0 ? this._loopStack[this._loopStack.length - 1] : '0')
    }

    continueLabel(): string {
        return '_continue_' + (this._loopStack.length > 0 ? this._loopStack[this._loopStack.length - 1] : '0')
    }

    // ========== 临时变量 ==========

    private _boolTempCount = 0
    allocBoolTemp(): string {
        const name = `_bool_tmp_${this._boolTempCount++}`
        this.allocator.alloc(name, 'BOOLEAN_VAR')
        return this.allocator.getId(name)
    }

    private _numTempCount = 0
    allocNumTemp(): string {
        const name = `_num_tmp_${this._numTempCount++}`
        this.allocator.alloc(name, 'NUMBER_VAR')
        return this.allocator.getId(name)
    }
}
