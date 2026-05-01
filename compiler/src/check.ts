import {break_tree, file_tree, func_tree, module_tree, var_tree, class_tree, interface_tree, enum_tree, import_tree, command_tree, identifier_var_tree, set_tree, return_tree, call_tree, get_node_tree, variable_get_tree, call_get_tree, new_get_tree, chain_get_tree, space_tree, block_tree, if_tree, while_tree, for_tree, switch_tree, foreach_tree, throw_tree, continue_tree, delete_tree, vm_tree, math_set_tree, super_tree, annotation_tree, modifiers, body, try_tree, lambda_get_tree, get_tree, param_call_tree, param_identifier_tree, identifier_tree, type_tree} from './tree'
import allang_log from './allang_log'
import {class_type_tree, basic_type_tree, array_type_tree, lambda_type_tree, map_type_tree} from './tree/identifier'
import {basic_type} from './model'

class scope_table<T> {
    private data: { [key: string]: T } = {}
    private parent: scope_table<T> | null = null

    constructor(parent?: scope_table<T>) {
        this.parent = parent || null
    }

    get(key: string): T | null {
        if (this.data.hasOwnProperty(key)) {
            return this.data[key]
        }
        if (this.parent) {
            return this.parent.get(key)
        }
        return null
    }

    set(key: string, value: T) {
        this.data[key] = value
    }

    has(key: string): boolean {
        if (this.data.hasOwnProperty(key)) {
            return true
        }
        if (this.parent) {
            return this.parent.has(key)
        }
        return false
    }

    has_local(key: string): boolean {
        return this.data.hasOwnProperty(key)
    }

    create_child(): scope_table<T> {
        return new scope_table<T>(this)
    }
}

interface symbol_info {
    type: 'var' | 'func' | 'class' | 'interface' | 'enum' | 'module' | 'param'
    tree?: space_tree | var_tree | func_tree | class_tree | interface_tree | enum_tree | module_tree
    var_type?: type_tree
}

export class check {
    tree: file_tree[]
    log: allang_log
    global_scope: scope_table<symbol_info>
    current_scope: scope_table<symbol_info>
    current_func: func_tree | null
    in_class: class_tree | null
    import_map: { [key: string]: string }

    constructor(tree: file_tree[], log: allang_log) {
        this.tree = tree
        this.log = log
        this.global_scope = new scope_table<symbol_info>()
        this.current_scope = this.global_scope
        this.current_func = null
        this.in_class = null
        this.import_map = {}
    }

    check_all(): void {
        for (const file of this.tree) {
            this.check_file(file)
        }
    }

    private check_file(file: file_tree): void {
        this.import_map = {}

        for (const imp of file.imports) {
            this.import_map[imp.name] = imp.module
        }

        for (const space of file.spaces) {
            if(!(space instanceof module_tree))this.log.error(`${space.name}不是模块`, '')
            this.check_space(space, this.global_scope)
        }
    }
    private check_space(space: space_tree, scope: scope_table<symbol_info>): void {
        const old_scope = this.current_scope
        this.current_scope = scope.create_child()

        if (space instanceof func_tree) {
            this.check_func(space)
        } else if (space instanceof class_tree) {
            this.check_class(space)
        } else if (space instanceof interface_tree) {
            this.check_interface(space)
        } else if (space instanceof enum_tree) {
            this.check_enum(space)
        } else if (space instanceof module_tree) {
            this.check_module(space)
        } else if (space instanceof var_tree) {
            this.check_var_declaration(space)
        }

        this.current_scope = old_scope
    }

    private check_func(func: func_tree): void {
        if (this.current_scope.has_local(func.name)) {
            this.log.error(`重复定义的标识符: ${func.name}`, '')
            return
        }

        this.current_scope.set(func.name, {
            type: 'func',
            tree: func
        })

        const old_func = this.current_func
        const old_scope = this.current_scope
        this.current_func = func
        this.current_scope = this.current_scope.create_child()

        if (func.params && func.params.param) {
            for (const param of func.params.param) {
                if (this.current_scope.has_local(param.key)) {
                    this.log.error(`重复的参数名: ${param.key}`, '')
                }
                this.current_scope.set(param.key, {
                    type: 'param',
                    var_type: param.value
                })
            }
        }

        if (func.commands) {
            this.check_commands(func.commands)
        }

        this.current_scope = old_scope
        this.current_func = old_func
    }

    private check_class(cls: class_tree): void {
        if (this.current_scope.has_local(cls.name)) {
            this.log.error(`重复定义的类: ${cls.name}`, '')
            return
        }

        this.current_scope.set(cls.name, {
            type: 'class',
            tree: cls
        })

        const old_class = this.in_class
        this.in_class = cls

        if (cls.children) {
            for (const child of cls.children) {
                if (child instanceof module_tree) {
                    this.log.error(`类内部不能定义模块: ${child.name}`, '')
                } else {
                    this.check_space(child, this.current_scope)
                }
            }
        }

        this.in_class = old_class
    }

    private check_module(mod: module_tree): void {
        if (this.current_scope.has_local(mod.name)) {
            this.log.error(`重复定义的模块: ${mod.name}`, '')
            return
        }

        this.current_scope.set(mod.name, {
            type: 'module',
            tree: mod
        })

        if (mod.children) {
            for (const child of mod.children) {
                this.check_space(child, this.current_scope)
            }
        }
    }
    private check_interface(iface: interface_tree): void {
        if (this.current_scope.has_local(iface.name)) {
            this.log.error(`重复定义的接口: ${iface.name}`, '')
            return
        }

        this.current_scope.set(iface.name, {
            type: 'interface',
            tree: iface
        })

        if (iface.func) {
            for (const func of iface.func) {
                this.check_func(func)
            }
        }
    }

    private check_enum(enm: enum_tree): void {
        if (this.current_scope.has_local(enm.name)) {
            this.log.error(`重复定义的枚举: ${enm.name}`, '')
            return
        }

        this.current_scope.set(enm.name, {
            type: 'enum',
            tree: enm
        })
    }
    private check_var_declaration(var_decl: var_tree): void {
        if (this.current_scope.has_local(var_decl.name)) {
            this.log.error(`重复定义的变量: ${var_decl.name}`, '')
            return
        }

        this.current_scope.set(var_decl.name, {
            type: 'var',
            tree: var_decl,
            var_type: var_decl.var_type
        })

        if (var_decl.value) {
            this.check_get_node(var_decl.value as get_node_tree)
        }
    }

    private check_commands(commands: command_tree[]): void {
        if (!commands) return

        for (const cmd of commands) {
            this.check_command(cmd)
        }
    }

    private check_command(cmd: command_tree): void {
        if (!cmd) return

        if (cmd instanceof identifier_var_tree) {
            this.check_var_init(cmd)
        } else if (cmd instanceof set_tree) {
            this.check_set(cmd)
        } else if (cmd instanceof call_tree) {
            this.check_call(cmd)
        } else if (cmd instanceof return_tree) {
            if (cmd.value) {
                this.check_get_node(cmd.value)
            }
        } else if (cmd instanceof if_tree) {
            this.check_if(cmd)
        } else if (cmd instanceof while_tree) {
            this.check_while(cmd)
        } else if (cmd instanceof for_tree) {
            this.check_for(cmd)
        } else if (cmd instanceof switch_tree) {
            this.check_switch(cmd)
        } else if (cmd instanceof foreach_tree) {
            this.check_foreach(cmd)
        } else if (cmd instanceof throw_tree) {
            if (cmd.value) {
                this.check_get_node(cmd.value)
            }
        } else if (cmd instanceof try_tree) {
            this.check_try(cmd)
        } else if (cmd instanceof delete_tree) {
            this.check_delete(cmd)
        } else if (cmd instanceof vm_tree) {
            // vm指令不做检查
        } else if (cmd instanceof break_tree || cmd instanceof continue_tree) {
            // break和continue不需要特殊检查
        } else if (cmd instanceof command_tree && cmd.commands) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(cmd.commands)
            this.current_scope = old_scope
        }
    }

    private check_var_init(var_init: identifier_var_tree): void {
        if (this.current_scope.has_local(var_init.identifier.key)) {
            this.log.error(`重复定义的变量: ${var_init.identifier.key}`, '')
            return
        }

        this.current_scope.set(var_init.identifier.key, {
            type: 'var',
            var_type: var_init.identifier.value
        })

        if (var_init.value) {
            this.check_get_node(var_init.value)
        }
    }

    private check_set(set_cmd: set_tree): void {
        if (set_cmd instanceof math_set_tree) {
            this.check_math_set(set_cmd)
            return
        }

        if (!this.check_variable_access(set_cmd.name)) {
            this.log.error(`未定义的变量: ${set_cmd.name}`, '')
        }

        if (set_cmd.value) {
            this.check_get_node(set_cmd.value)
        }
    }

    private check_math_set(math_set: math_set_tree): void {
        if (!this.check_variable_access(math_set.name)) {
            this.log.error(`未定义的变量: ${math_set.name}`, '')
        }

        if (math_set.value) {
            this.check_get_node(math_set.value)
        }
    }

    private check_call(call_cmd: call_tree): void {
        if (!this.current_scope.has(call_cmd.name)) {
            this.log.error(`未定义的函数或方法: ${call_cmd.name}`, '')
        }

        if (call_cmd.param && call_cmd.param.args) {
            for (const arg of call_cmd.param.args) {
                this.check_get_node(arg)
            }
        }
    }

    private check_if(if_cmd: if_tree): void {
        if (if_cmd.condition) {
            this.check_get_node(if_cmd.condition)
        }

        if (if_cmd.commands) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(if_cmd.commands)
            this.current_scope = old_scope
        }

        if (if_cmd.else_if) {
            for (const elif of if_cmd.else_if) {
                this.check_if(elif)
            }
        }

        if (if_cmd.else) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(if_cmd.else)
            this.current_scope = old_scope
        }
    }

    private check_while(while_cmd: while_tree): void {
        if (while_cmd.condition) {
            this.check_get_node(while_cmd.condition)
        }

        if (while_cmd.body) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(while_cmd.body)
            this.current_scope = old_scope
        }
    }

    private check_for(for_cmd: for_tree): void {
        const old_scope = this.current_scope
        this.current_scope = this.current_scope.create_child()

        if (for_cmd.init) {
            this.check_commands(for_cmd.init)
        }

        if (for_cmd.condition) {
            this.check_get_node(for_cmd.condition)
        }

        if (for_cmd.step) {
            this.check_commands(for_cmd.step)
        }

        if (for_cmd.body) {
            this.check_commands(for_cmd.body)
        }

        this.current_scope = old_scope
    }

    private check_switch(switch_cmd: switch_tree): void {
        if (switch_cmd.condition) {
            this.check_get_node(switch_cmd.condition)
        }

        if (switch_cmd.cases) {
            for (const case_item of switch_cmd.cases) {
                if (case_item.value) {
                    this.check_get_node(case_item.value as get_node_tree)
                }
                if (case_item.call) {
                    const old_scope = this.current_scope
                    this.current_scope = this.current_scope.create_child()
                    this.check_commands(case_item.call)
                    this.current_scope = old_scope
                }
            }
        }

        if (switch_cmd.default) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(switch_cmd.default)
            this.current_scope = old_scope
        }
    }

    private check_foreach(foreach_cmd: foreach_tree): void {
        if (foreach_cmd.array) {
            this.check_get_node(foreach_cmd.array)
        }

        const old_scope = this.current_scope
        this.current_scope = this.current_scope.create_child()

        if (foreach_cmd.identifier) {
            this.current_scope.set(foreach_cmd.identifier.identifier.key, {
                type: 'var',
                var_type: foreach_cmd.identifier.identifier.value
            })
        }

        if (foreach_cmd.commands) {
            this.check_commands(foreach_cmd.commands)
        }

        this.current_scope = old_scope
    }

    private check_try(try_cmd: try_tree): void {
        if (try_cmd.commands) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(try_cmd.commands)
            this.current_scope = old_scope
        }

        if (try_cmd.catch) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()

            if (try_cmd.catch.param && try_cmd.catch.param.param) {
                for (const param of try_cmd.catch.param.param) {
                    this.current_scope.set(param.key, {
                        type: 'param',
                        var_type: param.value
                    })
                }
            }

            if (try_cmd.catch.body) {
                this.check_commands(try_cmd.catch.body)
            }

            this.current_scope = old_scope
        }

        if (try_cmd.finally) {
            const old_scope = this.current_scope
            this.current_scope = this.current_scope.create_child()
            this.check_commands(try_cmd.finally)
            this.current_scope = old_scope
        }
    }

    private check_delete(delete_cmd: delete_tree): void {
        if (!this.check_variable_access(delete_cmd.name)) {
            this.log.error(`删除未定义的变量: ${delete_cmd.name}`, '')
        }
    }

    private check_get_node(node: get_node_tree): void {
        if (!node || !node.tree || !node.tree.chain) return

        for (const item of node.tree.chain) {
            this.check_get(item)
        }
    }

    private check_get(get_item: get_tree): void {
        if (!get_item) return

        if (get_item instanceof variable_get_tree) {
            this.check_variable_get(get_item)
        } else if (get_item instanceof call_get_tree) {
            this.check_call_get(get_item)
        } else if (get_item instanceof new_get_tree) {
            this.check_new_get(get_item)
        } else if (get_item instanceof chain_get_tree) {
            this.check_chain_get(get_item)
        } else if (get_item instanceof lambda_get_tree) {
            this.check_lambda_get(get_item)
        }
    }

    private check_variable_get(var_get: variable_get_tree): void {
        if (var_get.name === 'up') {
            return
        }

        if (var_get.name.startsWith('up.')) {
            this.check_up_access(var_get.name)
            return
        }

        if (!this.check_variable_access(var_get.name)) {
            this.log.error(`未定义的变量: ${var_get.name}`, '')
        }
    }

    private check_up_access(up_expr: string): void {
        const parts = up_expr.split('.')
        let up_count = 0
        let i = 0

        while (i < parts.length && parts[i] === 'up') {
            up_count++
            i++
        }

        if (i >= parts.length) {
            this.log.error(`无效的up访问: ${up_expr}`, '')
            return
        }

        const final_name = parts[i]

        let scope = this.current_scope
        for (let j = 0; j < up_count; j++) {
            if (scope['parent']) {
                scope = scope['parent'] as scope_table<symbol_info>
            } else {
                this.log.error(`up层级超出作用域范围: ${up_expr}`, '')
                return
            }
        }

        if (!scope.has(final_name)) {
            this.log.error(`通过up访问未定义的标识符: ${up_expr}`, '')
        }
    }

    private check_variable_access(name: string): boolean {
        if (name === 'up') {
            return true
        }

        if (name.startsWith('up.')) {
            return true
        }

        return this.current_scope.has(name)
    }

    private check_call_get(call_get: call_get_tree): void {
        if (!this.current_scope.has(call_get.name)) {
            this.log.error(`未定义的函数: ${call_get.name}`, '')
        }

        if (call_get.params && call_get.params.args) {
            for (const arg of call_get.params.args) {
                this.check_get_node(arg)
            }
        }
    }

    private check_new_get(new_get: new_get_tree): void {
        if (!this.current_scope.has(new_get.name)) {
            this.log.error(`未定义的类: ${new_get.name}`, '')
        }

        if (new_get.params && new_get.params.args) {
            for (const arg of new_get.params.args) {
                this.check_get_node(arg)
            }
        }
    }

    private check_chain_get(chain: chain_get_tree): void {
        if (chain.chain) {
            for (const item of chain.chain) {
                this.check_get(item)
            }
        }
    }

    private check_lambda_get(lambda: lambda_get_tree): void {
        const old_scope = this.current_scope
        this.current_scope = this.current_scope.create_child()

        if (lambda.param && lambda.param.param) {
            for (const param of lambda.param.param) {
                this.current_scope.set(param.key, {
                    type: 'param',
                    var_type: param.value
                })
            }
        }

        if (lambda.body) {
            this.check_commands(lambda.body)
        }

        this.current_scope = old_scope
    }
}
