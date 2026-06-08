/**
 * 作用域树 — 遍历 AST 构建完整的声明和作用域层次
 */
import {
    file_tree, space_tree, func_tree, class_tree, interface_tree,
    module_tree, var_tree, const_tree, enum_tree, import_tree
} from '../tree'
import {
    command_tree, if_tree, while_tree, for_tree, switch_tree,
    foreach_tree, try_tree, return_tree, break_tree, continue_tree,
    throw_tree, identifier_var_tree, set_tree, math_set_tree,
    call_tree, delete_tree, vm_tree, block_tree
} from '../tree'
import {lambda_get_tree, lambda_call_get_tree} from '../tree'
import {basic_type_tree} from '../tree'
import {basic_type} from '../model'

// ========== 类型定义 ==========

export type ScopeKind = 'root' | 'file' | 'module' | 'class' | 'interface' | 'function' | 'block'

export class Scope {
    kind: ScopeKind
    name: string
    parent: Scope | null
    children: Scope[]
    declarations: Map<string, DeclEntry[]>
    node: space_tree | command_tree | file_tree | null
    file: file_tree | null
    // 函数作用域是否有返回值
    return_type: any  // type_tree | null

    constructor(kind: ScopeKind, name: string, parent: Scope | null, node: any, file: file_tree | null) {
        this.kind = kind
        this.name = name
        this.parent = parent
        this.children = []
        this.declarations = new Map()
        this.node = node
        this.file = file
        this.return_type = null
    }

    addDecl(entry: DeclEntry) {
        const existing = this.declarations.get(entry.name)
        if (existing) {
            existing.push(entry)
        } else {
            this.declarations.set(entry.name, [entry])
        }
    }

    lookup(name: string): DeclEntry[] {
        return this.declarations.get(name) || []
    }

    lookupRecursive(name: string): DeclEntry[] {
        let s: Scope | null = this
        while (s) {
            const found = s.lookup(name)
            if (found.length > 0) return found
            s = s.parent
        }
        return []
    }
}

export type DeclKind = 'module' | 'class' | 'interface' | 'function' | 'var' | 'const' | 'enum' | 'import'

export class DeclEntry {
    name: string
    kind: DeclKind
    node: space_tree | identifier_var_tree | import_tree
    scope: Scope
    // 对于 function，记录参数签名
    paramSig: string | null

    constructor(name: string, kind: DeclKind, node: any, scope: Scope, paramSig: string | null = null) {
        this.name = name
        this.kind = kind
        this.node = node
        this.scope = scope
        this.paramSig = paramSig
    }
}

// ========== 作用域构建器 ==========

export class ScopeBuilder {
    root: Scope

    constructor() {
        this.root = new Scope('root', '__root__', null, null, null)
    }

    build(files: file_tree[]): Scope {
        // 第一步：为每个文件构建文件级作用域
        for (const file of files) {
            const fileScope = new Scope('file', '__file__', this.root, file, file)
            this.root.children.push(fileScope)
            // 收集 import
            for (const imp of file.imports) {
                fileScope.addDecl(new DeclEntry(imp.name, 'import', imp, fileScope))
            }
            // 处理 spaces
            for (const space of file.spaces) {
                this.processSpace(space, fileScope, file)
            }
        }

        // 第二步：合并同名模块
        this.mergeModules(this.root)

        return this.root
    }

    // ========== 处理 space ==========

    processSpace(space: space_tree, scope: Scope, file: file_tree) {
        if (space instanceof module_tree) {
            const decl = new DeclEntry(space.name, 'module', space, scope)
            scope.addDecl(decl)
            const childScope = new Scope('module', space.name, scope, space, file)
            scope.children.push(childScope)
            for (const child of space.children) {
                this.processSpace(child, childScope, file)
            }
        } else if (space instanceof class_tree) {
            const decl = new DeclEntry(space.name, 'class', space, scope)
            scope.addDecl(decl)
            const childScope = new Scope('class', space.name, scope, space, file)
            scope.children.push(childScope)
            for (const child of space.children) {
                this.processSpace(child, childScope, file)
            }
        } else if (space instanceof interface_tree) {
            const decl = new DeclEntry(space.name, 'interface', space, scope)
            scope.addDecl(decl)
            const childScope = new Scope('interface', space.name, scope, space, file)
            scope.children.push(childScope)
            // 接口中的函数声明
            for (const func of space.func) {
                const sig = this.funcParamSig(func)
                childScope.addDecl(new DeclEntry(func.name, 'function', func, childScope, sig))
            }
        } else if (space instanceof func_tree) {
            const sig = this.funcParamSig(space)
            const decl = new DeclEntry(space.name, 'function', space, scope, sig)
            scope.addDecl(decl)
            const childScope = new Scope('function', space.name, scope, space, file)
            childScope.return_type = space.return_type
            scope.children.push(childScope)
            // 处理函数参数（添加到函数作用域）
            if (space.params && space.params.param) {
                for (const p of space.params.param) {
                    childScope.addDecl(new DeclEntry(p.key, 'var', space, childScope))
                }
            }
            // 处理函数体中的命令
            if (space.commands) {
                this.processCommands(space.commands, childScope, file)
            }
        } else if (space instanceof var_tree) {
            scope.addDecl(new DeclEntry(space.name, 'var', space, scope))
        } else if (space instanceof const_tree) {
            scope.addDecl(new DeclEntry(space.name, 'const', space, scope))
        } else if (space instanceof enum_tree) {
            scope.addDecl(new DeclEntry(space.name, 'enum', space, scope))
        }
    }

    // ========== 处理命令 ==========

    processCommands(commands: command_tree[], scope: Scope, file: file_tree) {
        for (const cmd of commands) {
            this.processCommand(cmd, scope, file)
        }
    }

    processCommand(cmd: command_tree, scope: Scope, file: file_tree) {
        if (!cmd) return

        if (cmd instanceof block_tree) {
            const blockScope = new Scope('block', '__block__', scope, cmd, file)
            scope.children.push(blockScope)
            if (cmd.commands) {
                this.processCommands(cmd.commands, blockScope, file)
            }
        } else if (cmd instanceof if_tree) {
            if (cmd.commands) {
                this.processCommands(cmd.commands, scope, file)
            }
            for (const ei of cmd.else_if) {
                if (ei.commands) {
                    this.processCommands(ei.commands, scope, file)
                }
            }
            if (cmd.else) {
                this.processCommands(cmd.else, scope, file)
            }
        } else if (cmd instanceof while_tree) {
            if (cmd.commands) {
                this.processCommands(cmd.commands, scope, file)
            }
        } else if (cmd instanceof for_tree) {
            if (cmd.init) this.processLambdaCommands(cmd.init, scope, file)
            if (cmd.condition) this.processLambdaCommands(cmd.condition, scope, file)
            if (cmd.step) this.processLambdaCommands(cmd.step, scope, file)
            if (cmd.body) this.processCommands(cmd.body, scope, file)
        } else if (cmd instanceof foreach_tree) {
            // foreach 的循环变量
            if (cmd.identifier) {
                scope.addDecl(new DeclEntry(cmd.identifier.identifier.key, 'var', cmd.identifier, scope))
            }
            if (cmd.commands) {
                this.processCommands(cmd.commands, scope, file)
            }
        } else if (cmd instanceof switch_tree) {
            for (const c of cmd.cases) {
                if (c.call) this.processCommands(c.call, scope, file)
            }
            if (cmd.default) {
                this.processCommands(cmd.default, scope, file)
            }
        } else if (cmd instanceof try_tree) {
            if (cmd.commands) this.processCommands(cmd.commands, scope, file)
            if (cmd.catch) this.processLambdaCommands(cmd.catch, scope, file)
            if (cmd.finally) this.processCommands(cmd.finally, scope, file)
        } else if (cmd instanceof identifier_var_tree) {
            scope.addDecl(new DeclEntry(cmd.identifier.key, 'var', cmd, scope))
        }
    }

    processLambdaCommands(lambda: lambda_get_tree, scope: Scope, file: file_tree) {
        const lambdaScope = new Scope('function', '__lambda__', scope, lambda, file)
        scope.children.push(lambdaScope)
        if (lambda.param && lambda.param.param) {
            for (const p of lambda.param.param) {
                lambdaScope.addDecl(new DeclEntry(p.key, 'var', lambda, lambdaScope))
            }
        }
        if (lambda.body) {
            this.processCommands(lambda.body, lambdaScope, file)
        }
    }

    // ========== 辅助 ==========

    funcParamSig(func: func_tree): string {
        if (!func.params || !func.params.param) return '()'
        const parts = func.params.param.map(p => {
            if (p.value instanceof basic_type_tree) {
                return basic_type[p.value.type_name]
            }
            return p.key
        })
        return '(' + parts.join(',') + ')'
    }

    // ========== 模块合并 ==========

    mergeModules(scope: Scope) {
        // 递归：先合并子级
        for (const child of scope.children) {
            this.mergeModules(child)
        }

        // 当前层级：合并同名模块
        this.mergeModulesAtLevel(scope)

        // root 特殊处理：跨文件合并同名模块
        if (scope.kind === 'root') {
            this.mergeAcrossFiles(scope)
        }
    }

    mergeAcrossFiles(root: Scope) {
        // 收集所有 file scope 下的顶级模块
        const allModules = new Map<string, Scope[]>()
        for (const fileScope of root.children) {
            for (const child of fileScope.children) {
                if (child.kind === 'module') {
                    const existing = allModules.get(child.name)
                    if (existing) existing.push(child)
                    else allModules.set(child.name, [child])
                }
            }
        }

        // 合并跨文件的同名模块
        for (const [name, mods] of allModules) {
            if (mods.length <= 1) continue
            const first = mods[0]
            for (let i = 1; i < mods.length; i++) {
                const other = mods[i]
                // 移动 children
                for (const child of other.children) {
                    child.parent = first
                    first.children.push(child)
                }
                // 合并 declarations
                for (const [dname, decls] of other.declarations) {
                    for (const d of decls) {
                        d.scope = first
                        first.addDecl(d)
                    }
                }
                // 从原父级移除
                const parentChildren = other.parent?.children
                if (parentChildren) {
                    const idx = parentChildren.indexOf(other)
                    if (idx >= 0) parentChildren.splice(idx, 1)
                }
            }
            // 递归合并被合并模块内部的同名子模块
            this.mergeModulesAtLevel(first)
        }
    }

    mergeModulesAtLevel(scope: Scope) {
        // 收集当前 scope 下的同名模块
        const moduleGroups = new Map<string, Scope[]>()
        for (const child of scope.children) {
            if (child.kind === 'module') {
                const existing = moduleGroups.get(child.name)
                if (existing) existing.push(child)
                else moduleGroups.set(child.name, [child])
            }
        }

        // 合并每组同名模块
        for (const [name, mods] of moduleGroups) {
            if (mods.length <= 1) continue
            const first = mods[0]
            for (let i = 1; i < mods.length; i++) {
                const other = mods[i]
                // 合并 children
                for (const child of other.children) {
                    child.parent = first
                    first.children.push(child)
                }
                // 合并 declarations
                for (const [dname, decls] of other.declarations) {
                    for (const d of decls) {
                        d.scope = first
                        first.addDecl(d)
                    }
                }
                // 从父级移除
                const idx = scope.children.indexOf(other)
                if (idx >= 0) scope.children.splice(idx, 1)
            }
            // 递归合并被合并模块内部的同名子模块
            this.mergeModulesAtLevel(first)
        }
    }
}