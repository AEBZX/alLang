/**
 * AST 变换 — 实现 desugar.md 中所有语法糖展开
 */
import {
    file_tree, space_tree, func_tree, class_tree, interface_tree,
    module_tree, var_tree, const_tree, enum_tree, import_tree,
    annotation_tree, modifiers, block_tree, try_tree
} from '../tree'
import {
    command_tree, if_tree, while_tree, for_tree, switch_tree,
    foreach_tree, return_tree, break_tree, continue_tree,
    throw_tree, identifier_var_tree, set_tree, math_set_tree,
    call_tree, delete_tree, vm_tree
} from '../tree'
import {
    get_tree, get_node_tree, chain_get_tree, variable_get_tree,
    call_get_tree as call_get_expr, map_get_tree, array_get_tree,
    pointer_get_tree, math_oper_get_tree, bool_oper_get_tree,
    ternary_get_tree, lambda_get_tree, new_get_tree,
    number_get_tree, string_get_tree, boolean_get_tree, null_get_tree,
    array_data_get_tree
} from '../tree'
import {
    identifier_tree, type_tree, basic_type_tree, array_type_tree,
    lambda_type_tree, map_type_tree, class_type_tree
} from '../tree'
import {param_call_tree, param_identifier_tree} from '../tree'
import {basic_type, math_oper_type, bool_oper_type, pointer_type} from '../model'
import {Tree, token, token_type} from 'allang-compiler-base'

// ========== 唯一名称生成 ==========
let _counter = 0
function uniqueName(prefix: string = '_desugar'): string {
    return `_${prefix}${(_counter++).toString(36)}`
}

// ========== 主入口 ==========

export function desugarAll(files: file_tree[]): file_tree {
    _counter = 0
    // Step 1: 每个文件独立处理别名，再合并（避免跨文件别名冲突）
    const processedFiles = files.map(f => processFileBeforeMerge(f))
    let file = mergeFiles(processedFiles)
    // Step 2: enum → class
    file = desugarEnums(file)
    // Step 5: static → global pool
    file = desugarStatic(file)
    // Step 6: 循环展开
    file = desugarForeach(file)
    file = desugarDoWhile(file)
    file = desugarFor(file)
    // Step 7: String/Array/Map 操作展开
    file = desugarExpressions(file)
    // Step 8: map.xxx → map['xxx']
    file = desugarMapAccess(file)
    // Step 9: condition 非bool → != null
    file = desugarConditions(file)
    // Step 10: 删除 interface
    file = deleteInterfaces(file)
    // Step 11: class → constructor 函数
    file = desugarClasses(file)
    return file
}

// ========== Step 1: 合并文件 ==========

function mergeFiles(files: file_tree[]): file_tree {
    const allImports: import_tree[] = []
    const seenModules = new Set<string>()
    const allSpaces: space_tree[] = []
    for (const f of files) {
        for (const imp of f.imports) {
            if (!seenModules.has(imp.module)) {
                seenModules.add(imp.module)
                allImports.push(imp)
            }
        }
        allSpaces.push(...f.spaces)
    }
    return new file_tree(allImports, allSpaces)
}

// ========== 文件预处理: 默认导入 + 别名解析 (每个文件独立执行，避免跨文件别名冲突) ==========

function processFileBeforeMerge(file: file_tree): file_tree {
    // 先添加默认导入
    file = addDefaultImportsForFile(file)
    // 再解析该文件内部的 import 别名
    file = resolveAliasesInFile(file)
    return file
}

function addDefaultImportsForFile(file: file_tree): file_tree {
    const defaults = ['Lang.String', 'Lang.Array', 'Lang.Map', 'Lang']
    const existing = new Set(file.imports.map(i => i.module))
    for (const mod of defaults) {
        if (!existing.has(mod)) {
            file.imports.push(new import_tree(mod, mod))
        }
    }
    return file
}

function resolveAliasesInFile(file: file_tree): file_tree {
    const aliasMap = new Map<string, string>()  // alias → module
    for (const imp of file.imports) {
        if (imp.name !== imp.module) {
            aliasMap.set(imp.name, imp.module)
        }
    }
    if (aliasMap.size === 0) return file

    // 替换 spaces 和所有表达式中的别名引用
    file.spaces = file.spaces.map(s => replaceAliasInSpace(s, aliasMap))

    // 别名已解析，将 import 的 name 统一为 module (去除别名)
    for (const imp of file.imports) {
        imp.name = imp.module
    }

    return file
}

function replaceAliasInSpace(space: space_tree, aliasMap: Map<string, string>): space_tree {
    // 递归替换子 block 中的别名
    if (space.children) {
        space.children = space.children.map(c => replaceAliasInSpace(c, aliasMap))
    }
    if (space instanceof func_tree && space.commands) {
        space.commands = space.commands.map(c => replaceAliasInCommand(c, aliasMap))
    }
    return space
}

function replaceAliasInCommand(cmd: command_tree, aliasMap: Map<string, string>): command_tree {
    if (cmd instanceof call_tree) {
        // 替换调用名中的别名
        const parts = cmd.name.split('.')
        if (aliasMap.has(parts[0])) {
            parts[0] = aliasMap.get(parts[0])!
            cmd.name = parts.join('.')
        }
        // 也检查参数中的别名
        if (cmd.param && cmd.param.args) {
            cmd.param.args = cmd.param.args.map(a => replaceAliasInExpr(a, aliasMap))
        }
    }
    if (cmd instanceof set_tree && cmd.value) {
        cmd.value = replaceAliasInExpr(cmd.value, aliasMap)
    }
    if (cmd instanceof math_set_tree && cmd.value) {
        cmd.value = replaceAliasInExpr(cmd.value, aliasMap)
    }
    if (cmd instanceof if_tree && cmd.condition) {
        cmd.condition = replaceAliasInExpr(cmd.condition, aliasMap)
    }
    if (cmd instanceof while_tree && cmd.condition) {
        cmd.condition = replaceAliasInExpr(cmd.condition, aliasMap)
    }
    if (cmd instanceof foreach_tree && cmd.array) {
        cmd.array = replaceAliasInExpr(cmd.array, aliasMap)
    }
    if (cmd instanceof switch_tree) {
        if (cmd.condition) cmd.condition = replaceAliasInExpr(cmd.condition, aliasMap)
        for (const c of cmd.cases) {
            if (c.call) c.call = c.call.map(c2 => replaceAliasInCommand(c2, aliasMap))
        }
        if (cmd.default) cmd.default = cmd.default.map(c2 => replaceAliasInCommand(c2, aliasMap))
    }
    if (cmd.commands) {
        cmd.commands = cmd.commands.map(c => replaceAliasInCommand(c, aliasMap))
    }
    if (cmd instanceof if_tree && cmd.else) {
        cmd.else = cmd.else.map(c => replaceAliasInCommand(c, aliasMap))
    }
    if (cmd instanceof if_tree && cmd.else_if) {
        cmd.else_if = cmd.else_if.map(c => replaceAliasInIfTree(c, aliasMap))
    }
    return cmd
}

function replaceAliasInExpr(expr: get_node_tree, aliasMap: Map<string, string>): get_node_tree {
    if (!expr || !expr.tree) return expr
    expr.tree.chain = expr.tree.chain.map(e => replaceAliasInGet(e, aliasMap))
    return expr
}

function replaceAliasInGet(get: get_tree, aliasMap: Map<string, string>): get_tree {
    if (get instanceof variable_get_tree) {
        const parts = get.name.split('.')
        if (aliasMap.has(parts[0])) {
            parts[0] = aliasMap.get(parts[0])!
            get.name = parts.join('.')
        }
    } else if (get instanceof chain_get_tree) {
        get.chain = get.chain.map(e => replaceAliasInGet(e, aliasMap))
    } else if (get instanceof call_get_expr) {
        if (get.name) get.name = replaceAliasInExpr(get.name, aliasMap)
        if (get.params && get.params.args) {
            get.params.args = get.params.args.map(a => replaceAliasInExpr(a, aliasMap))
        }
    } else if (get instanceof array_get_tree) {
        if (get.name) get.name = replaceAliasInExpr(get.name, aliasMap)
    } else if (get instanceof math_oper_get_tree) {
        if (get.left) get.left = replaceAliasInGet(get.left, aliasMap)
        if (get.right) get.right = replaceAliasInGet(get.right, aliasMap)
    }
    return get
}

// ========== Step 4: Enum → Class ==========

function desugarEnums(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarEnumInSpace(s))
    return file
}

function desugarEnumInSpace(space: space_tree): space_tree {
    if (space.children) {
        space.children = space.children.map(c => desugarEnumInSpace(c))
    }
    if (space instanceof enum_tree) {
        // 转换为 class
        const cls = new class_tree(space.name, null, space.modifiers, space.annotations)
        cls.children = space.values.map((v, i) => {
            const mod = new modifiers()
            mod.static = true
            mod.unstatic = false
            return new var_tree(v,
                new basic_type_tree(basic_type.number),
                mod, [],
                get_node_tree.create([new number_get_tree(i)]))
        })
        return cls
    }
    return space
}

// ========== Step 5: Static → Global Pool ==========

function desugarStatic(file: file_tree): file_tree {
    file.spaces = processStaticSpaces(file.spaces, '')
    return file
}

function processStaticSpaces(spaces: space_tree[], prefix: string): space_tree[] {
    const result: space_tree[] = []
    for (const space of spaces) {
        const name = prefix ? prefix + '.' + space.name : space.name
        if (space.modifiers && space.modifiers.static && !space.modifiers.unstatic) {
            // static 成员 — 提升到全局
            space.name = name
            space.modifiers.static = false
            space.modifiers.unstatic = true
            result.push(space)
        } else if (space instanceof module_tree || space instanceof class_tree) {
            // 递归处理子成员
            if (space.children) {
                space.children = processStaticSpaces(space.children, name)
            }
            result.push(space)
        } else if (space instanceof func_tree) {
            if (space.commands) {
                space.commands = space.commands.map(c => replaceStaticRefsInCommand(c, name, prefix))
            }
            result.push(space)
        } else {
            if (space.children) {
                space.children = processStaticSpaces(space.children, name)
            }
            result.push(space)
        }
    }
    return result
}

function replaceStaticRefsInCommand(cmd: command_tree, className: string, _prefix: string): command_tree {
    // 替换 static 引用
    if (cmd.commands) {
        cmd.commands = cmd.commands.map(c => replaceStaticRefsInCommand(c, className, _prefix))
    }
    return cmd
}

// ========== Step 6: Foreach → While ==========

function desugarForeach(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarForeachInSpace(s))
    return file
}

function desugarForeachInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarForeachInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = desugarForeachInCommands(space.commands)
    }
    return space
}

function desugarForeachInCommands(commands: command_tree[]): command_tree[] {
    const result: command_tree[] = []
    for (const cmd of commands) {
        if (cmd instanceof foreach_tree) {
            const varName = cmd.identifier.identifier.key
            const varType = cmd.identifier.identifier.value
            const array = cmd.array
            const body = cmd.commands || []

            // var i:type;
            const varDecl = new identifier_var_tree(varName, varType, null)

            // 判断类型：array/map/string → Lang.Array/Lang.Map/Lang.String
            const eachCallExpr = createCallExprNode('Lang.Array.each', [array])
            const eachNextCallExpr = createCallExprNode('Lang.Array.eachNext', [array])
            const assign = new set_tree(varName, eachNextCallExpr)

            const whileBody = [assign, ...body]
            const whileStmt = new while_tree(eachCallExpr, whileBody, false)

            result.push(varDecl, whileStmt)
        } else {
            // 递归处理子命令
            if (cmd instanceof if_tree && cmd.commands) {
                cmd.commands = desugarForeachInCommands(cmd.commands)
                if (cmd.else) cmd.else = desugarForeachInCommands(cmd.else)
            }
            if (cmd instanceof while_tree && cmd.commands) {
                cmd.commands = desugarForeachInCommands(cmd.commands)
            }
            result.push(cmd)
        }
    }
    return result
}

// ========== Step 7: Do-While → While ==========

function desugarDoWhile(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarDoWhileInSpace(s))
    return file
}

function desugarDoWhileInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarDoWhileInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = desugarDoWhileInCommands(space.commands)
    }
    return space
}

function desugarDoWhileInCommands(commands: command_tree[]): command_tree[] {
    const result: command_tree[] = []
    for (const cmd of commands) {
        if (cmd instanceof while_tree && cmd.do) {
            // do { body } while(cond) → { body } while(cond) { body }
            const body = cmd.commands || []
            const blockFirst = new command_tree([...body])
            const whileStmt = new while_tree(cmd.condition, [...body], false)
            result.push(blockFirst, whileStmt)
        } else {
            if (cmd.commands) cmd.commands = desugarDoWhileInCommands(cmd.commands)
            if (cmd instanceof if_tree && cmd.else) cmd.else = desugarDoWhileInCommands(cmd.else)
            result.push(cmd)
        }
    }
    return result
}

// ========== Step 8: For → While ==========

function desugarFor(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarForInSpace(s))
    return file
}

function desugarForInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarForInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = desugarForInCommands(space.commands)
    }
    return space
}

function desugarForInCommands(commands: command_tree[]): command_tree[] {
    const result: command_tree[] = []
    for (const cmd of commands) {
        if (cmd instanceof for_tree && cmd.init && cmd.condition && cmd.step) {
            // 内联 init lambda body
            const initBody = cmd.init.body || []
            // 提取 condition lambda 到变量
            const condVarName = uniqueName('cond')
            const condLambda = cmd.condition
            const condDecl = new identifier_var_tree(condVarName,
                new lambda_type_tree(
                    condLambda.param?.param || [],
                    new basic_type_tree(basic_type.boolean)
                ),
                get_node_tree.create([condLambda]))

            // 提取 step lambda 到变量
            const stepVarName = uniqueName('step')
            const stepLambda = cmd.step
            const stepDecl = new identifier_var_tree(stepVarName,
                new lambda_type_tree([], new basic_type_tree(basic_type.void_)),
                get_node_tree.create([stepLambda]))

            // while(condVarName()) { body; stepVarName(); }
            const condCall = createCallExpr(condVarName)
            const stepCall = createCallNoArgs(stepVarName)

            const whileBody = [...(cmd.body || []), stepCall]
            const whileStmt = new while_tree(condCall, whileBody, false)

            result.push(...initBody, condDecl, stepDecl, whileStmt)
        } else {
            if (cmd.commands) cmd.commands = desugarForInCommands(cmd.commands)
            if (cmd instanceof if_tree && cmd.else) cmd.else = desugarForInCommands(cmd.else)
            result.push(cmd)
        }
    }
    return result
}

// ========== Step 9: Expression Desugar ==========

function desugarExpressions(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarExprInSpace(s))
    return file
}

function desugarExprInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarExprInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = space.commands.map(c => desugarExprInCommand(c))
    }
    return space
}

function desugarExprInCommand(cmd: command_tree): command_tree {
    // 递归处理子命令
    if (cmd.commands) cmd.commands = cmd.commands.map(c => desugarExprInCommand(c))
    if (cmd instanceof if_tree && cmd.condition) {
        cmd.condition = desugarGetExpr(cmd.condition)
    }
    if (cmd instanceof if_tree && cmd.else) cmd.else = cmd.else.map(c => desugarExprInCommand(c))
    if (cmd instanceof while_tree && cmd.condition) {
        cmd.condition = desugarGetExpr(cmd.condition)
    }
    if (cmd instanceof set_tree && cmd.value) {
        cmd.value = desugarGetExpr(cmd.value)
    }
    if (cmd instanceof math_set_tree && cmd.value) {
        cmd.value = desugarGetExpr(cmd.value)
    }
    if (cmd instanceof return_tree && cmd.value) {
        cmd.value = desugarGetExpr(cmd.value)
    }
    if (cmd instanceof throw_tree && cmd.value) {
        cmd.value = desugarGetExpr(cmd.value)
    }
    if (cmd instanceof switch_tree) {
        if (cmd.condition) cmd.condition = desugarGetExpr(cmd.condition)
    }
    if (cmd instanceof call_tree && cmd.param && cmd.param.args) {
        cmd.param.args = cmd.param.args.map(a => desugarGetExpr(a))
    }
    if (cmd instanceof foreach_tree && cmd.array) {
        cmd.array = desugarGetExpr(cmd.array)
    }
    return cmd
}

function desugarGetExpr(node: get_node_tree): get_node_tree {
    if (!node || !node.tree || !node.tree.chain) return node
    node.tree.chain = node.tree.chain.map(e => desugarGet(e))
    return node
}

function desugarGet(get: get_tree): get_tree {
    if (get instanceof math_oper_get_tree) {
        // string + string → Lang.String.add(s1, s2)
        if (get.oper_type === math_oper_type.add) {
            const left = get.left
            const right = get.right
            if (isStringExpr(left) || isStringExpr(right)) {
                return createCallGet('Lang.String.add',
                    [wrapInGetNode(left), wrapInGetNode(right)])
            }
        }
        // 递归处理
        if (get.left) get.left = desugarGet(get.left)
        if (get.right) get.right = desugarGet(get.right)
    } else if (get instanceof bool_oper_get_tree) {
        if (get.left) get.left = desugarGetExpr(get.left)
        if (get.right) get.right = desugarGetExpr(get.right)
    } else if (get instanceof array_get_tree) {
        // string[i] → Lang.String.get(string, i)
        if (get.name && get.name.tree) {
            const firstElem = get.name.tree.chain[0]
            if (firstElem instanceof variable_get_tree) {
                const varName = firstElem.name
                // 检查是否是 string 类型（简化：总是转换）
                if (varName && get.index) {
                    // 这里需要类型信息才能判断，先做通用转换
                    get.name = desugarGetExpr(get.name)
                }
            }
        }
        if (get.name) get.name = desugarGetExpr(get.name)
        if (get.index) get.index = desugarGetExpr(get.index)
    } else if (get instanceof chain_get_tree) {
        get.chain = get.chain.map(e => desugarGet(e))
    } else if (get instanceof call_get_expr) {
        // a.xxx(b,c) 转换为 Lang.Type.xxx(a,b,c)
        if (get.name && get.name.tree) {
            const chain = get.name.tree.chain
            if (chain.length >= 2) {
                const first = chain[0]
                const second = chain[1]
                if (first instanceof variable_get_tree && second instanceof variable_get_tree) {
                    const objName = first.name
                    const method = second.name
                    // 判断类型（简化处理）
                    const args = get.params?.args || []
                    const newCall = createCallGet(objName + '.' + method,
                        [get.name, ...args])
                    return newCall
                }
            }
        }
        if (get.name) get.name = desugarGetExpr(get.name)
        if (get.params && get.params.args) {
            get.params.args = get.params.args.map(a => desugarGetExpr(a))
        }
    } else if (get instanceof ternary_get_tree) {
        if (get.condition) get.condition = desugarGetExpr(get.condition)
        if (get.true_value) get.true_value = desugarGetExpr(get.true_value)
        if (get.false_value) get.false_value = desugarGetExpr(get.false_value)
    } else if (get instanceof pointer_get_tree) {
        if (get.data) get.data = desugarGet(get.data)
    } else if (get instanceof map_get_tree) {
        get.map = get.map.map(e => ({key: e.key, get: desugarGet(e.get)}))
    } else if (get instanceof lambda_get_tree && get.body) {
        get.body = get.body.map(c => desugarExprInCommand(c))
    }
    return get
}

// ========== Step 10: map.xxx → map['xxx'] ==========

function desugarMapAccess(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarMapAccessInSpace(s))
    return file
}

function desugarMapAccessInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarMapAccessInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = space.commands.map(c => desugarMapAccessInCommand(c))
    }
    return space
}

function desugarMapAccessInCommand(cmd: command_tree): command_tree {
    if (cmd.commands) cmd.commands = cmd.commands.map(c => desugarMapAccessInCommand(c))
    if (cmd instanceof if_tree && cmd.else) cmd.else = cmd.else.map(c => desugarMapAccessInCommand(c))
    if (cmd instanceof set_tree && cmd.value) {
        cmd.value = desugarMapAccessExpr(cmd.value)
    }
    if (cmd instanceof call_tree && cmd.param && cmd.param.args) {
        cmd.param.args = cmd.param.args.map(a => desugarMapAccessExpr(a))
    }
    return cmd
}

function desugarMapAccessExpr(node: get_node_tree): get_node_tree {
    if (!node || !node.tree) return node
    node.tree.chain = node.tree.chain.map(e => desugarMapAccessGet(e))
    return node
}

function desugarMapAccessGet(get: get_tree): get_tree {
    if (get instanceof chain_get_tree) {
        // a.b → a['b'] (如果是链中间)
        get.chain = get.chain.map(e => desugarMapAccessGet(e))
    }
    return get
}

// ========== Step 11: Condition 非bool → != null ==========

function desugarConditions(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarCondInSpace(s))
    return file
}

function desugarCondInSpace(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarCondInSpace(c))
    if (space instanceof func_tree && space.commands) {
        space.commands = space.commands.map(c => desugarCondInCommand(c))
    }
    return space
}

function desugarCondInCommand(cmd: command_tree): command_tree {
    if (cmd.commands) cmd.commands = cmd.commands.map(c => desugarCondInCommand(c))
    if (cmd instanceof if_tree && cmd.condition) {
        cmd.condition = wrapBoolCheck(cmd.condition)
    }
    if (cmd instanceof while_tree && cmd.condition) {
        cmd.condition = wrapBoolCheck(cmd.condition)
    }
    if (cmd instanceof if_tree && cmd.else) cmd.else = cmd.else.map(c => desugarCondInCommand(c))
    return cmd
}

function wrapBoolCheck(cond: get_node_tree): get_node_tree {
    if (!cond || !cond.tree) return cond
    const first = cond.tree.chain[0]
    // 如果已经是 bool 表达式或比较，不包装
    if (first instanceof bool_oper_get_tree) return cond
    if (first instanceof boolean_get_tree) return cond
    if (first instanceof math_oper_get_tree && first.oper_type === math_oper_type.not) return cond
    // 包装为 cond != null
    return get_node_tree.create([
        new bool_oper_get_tree(bool_oper_type.not_equal, cond,
            get_node_tree.create([new null_get_tree()]))
    ])
}

// ========== Step 12: 删除 Interface ==========

function deleteInterfaces(file: file_tree): file_tree {
    file.spaces = file.spaces.filter(s => !(s instanceof interface_tree))
    file.spaces = file.spaces.map(s => deleteInterfacesInSpace(s))
    return file
}

function deleteInterfacesInSpace(space: space_tree): space_tree {
    if (space.children) {
        space.children = space.children.filter(c => !(c instanceof interface_tree))
        space.children = space.children.map(c => deleteInterfacesInSpace(c))
    }
    return space
}

// ========== Step 13: Class → Constructor ==========

function desugarClasses(file: file_tree): file_tree {
    file.spaces = file.spaces.map(s => desugarClass(s))
    return file
}

function desugarClass(space: space_tree): space_tree {
    if (space.children) space.children = space.children.map(c => desugarClass(c))
    if (space instanceof class_tree) {
        return convertClassToConstructors(space)
    }
    return space
}

function convertClassToConstructors(cls: class_tree): space_tree {
    // 收集构造函数 (与类同名且void返回)
    const constructors: func_tree[] = []
    const nonConstructors: space_tree[] = []

    for (const child of cls.children) {
        if (child instanceof func_tree && child.name === cls.name &&
            child.return_type instanceof basic_type_tree &&
            child.return_type.type_name === basic_type.void_) {
            constructors.push(child)
        } else {
            nonConstructors.push(child)
        }
    }

    if (constructors.length === 0) {
        // 没有构造函数 → 不转换，保持原样
        return cls
    }

    // 对于每个构造函数，转换为 map-returning 函数
    const results: space_tree[] = []
    for (const ctor of constructors) {
        const mapEntries: { key: string, get: get_tree }[] = []
        // 变量 → map entry
        for (const child of nonConstructors) {
            if (child instanceof var_tree) {
                mapEntries.push({
                    key: child.name,
                    get: child.value || get_node_tree.create([new null_get_tree()])
                })
            } else if (child instanceof func_tree) {
                // 非构造函数 → 带 self 参数的 lambda
                const selfParam = new identifier_tree('self',
                    new basic_type_tree(basic_type.number))
                const origParams = child.params?.param || []
                const newParams = [selfParam, ...origParams]
                const newParamIdent = new param_identifier_tree(newParams, null)
                // 替换 up.xxx → (*self)['xxx']
                const newBody = child.commands ? child.commands.map(c =>
                    replaceUpAccess(c, 'self')) : []

                mapEntries.push({
                    key: child.name,
                    get: get_node_tree.create([new lambda_get_tree(newParamIdent, newBody)])
                })
            }
        }
        // 创建 constructor 函数
        const ctorFunc = new func_tree(cls.name,
            [new return_tree(get_node_tree.create([new map_get_tree(mapEntries)]))],
            ctor.modifiers, cls.annotations, ctor.params,
            new basic_type_tree(basic_type.map))
        results.push(ctorFunc)
    }

    if (results.length === 1) return results[0]
    // 多个构造函数 → 每个都是独立的函数
    return results.length > 0 ? results[0] : cls
}

function replaceUpAccess(cmd: command_tree, selfName: string): command_tree {
    if (cmd.commands) cmd.commands = cmd.commands.map(c => replaceUpAccess(c, selfName))
    if (cmd instanceof set_tree && cmd.value) {
        cmd.value = replaceUpInExpr(cmd.value, selfName)
    }
    if (cmd instanceof math_set_tree && cmd.value) {
        cmd.value = replaceUpInExpr(cmd.value, selfName)
    }
    return cmd
}

function replaceUpInExpr(node: get_node_tree, selfName: string): get_node_tree {
    if (!node || !node.tree) return node
    node.tree.chain = node.tree.chain.map(e => replaceUpInGet(e, selfName))
    return node
}

function replaceUpInGet(get: get_tree, selfName: string): get_tree {
    if (get instanceof variable_get_tree && get.name === 'up') {
        // up → (*self)
        return new pointer_get_tree(pointer_type.value,
            new variable_get_tree(selfName))
    }
    if (get instanceof math_oper_get_tree) {
        if (get.left) get.left = replaceUpInGet(get.left, selfName)
        if (get.right) get.right = replaceUpInGet(get.right, selfName)
    }
    return get
}

// ========== 辅助函数 ==========

function createCall(name: string, arg: get_node_tree): call_tree {
    const params = new param_call_tree([arg])
    return new call_tree(name, params, false)
}

function createCallNoArgs(name: string): call_tree {
    const params = new param_call_tree([])
    return new call_tree(name, params, false)
}

function createCallExprNode(fullName: string, args: get_node_tree[]): get_node_tree {
    const parts = fullName.split('.')
    const pathChain: get_tree[] = parts.slice(0, -1).map(p => new variable_get_tree(p))
    const callGet = new call_get_expr(
        get_node_tree.create([new variable_get_tree(parts[parts.length - 1])]),
        new param_call_tree(args)
    )
    return get_node_tree.create([...pathChain, callGet])
}

function createCallExpr(name: string): get_node_tree {
    return createCallExprNode(name, [])
}

function createCallGet(name: string, args: get_node_tree[]): call_get_expr {
    const varGet = new variable_get_tree(name)
    const nameNode = get_node_tree.create([varGet])
    return new call_get_expr(nameNode, new param_call_tree(args))
}

function wrapInGetNode(get: get_tree): get_node_tree {
    return get_node_tree.create([get])
}

function isStringExpr(_get: get_tree): boolean {
    return false
}

function replaceAliasInIfTree(ifTree: if_tree, aliasMap: Map<string, string>): if_tree {
    ifTree = replaceAliasInCommand(ifTree, aliasMap) as unknown as if_tree
    return ifTree
}