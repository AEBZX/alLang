import {break_tree, file_tree, func_tree, module_tree, var_tree, class_tree, interface_tree, enum_tree, import_tree, command_tree, identifier_var_tree, set_tree, return_tree, call_tree, get_node_tree, variable_get_tree, call_get_tree, new_get_tree, chain_get_tree} from './tree'
import allang_log from './allang_log'
import {space_tree, annotation_tree, modifiers} from "./tree/block"
import {type_tree, basic_type_tree, array_type_tree, lambda_type_tree, class_type_tree} from "./tree/identifier"
import {basic_type} from "./model"

export class check {
    log: allang_log
    data: file_tree[]
    module_registry: Map<string, space_tree>
    imported_modules: Map<string, string>
    current_scope: space_tree[]
    file_module_map: Map<file_tree, Set<string>>

    constructor(data: file_tree[], log: allang_log) {
        this.data = data
        this.log = log
        this.module_registry = new Map()
        this.imported_modules = new Map()
        this.current_scope = []
        this.file_module_map = new Map()
    }

    check_all(): void {
        this.build_module_registry()

        for (let file of this.data) {
            this.check_file(file)
        }
    }
    private check_get(get: any): void {
        if (get instanceof variable_get_tree) {
            this.check_variable_access(get.name)
        } else if (get instanceof call_get_tree) {
            if (get.name.includes('.')) {
                this.check_dotted_access(get.name, 'function')
            } else {
                let resolved = this.resolve_function_name(get.name)
                if (!resolved) {
                    this.log.error(`Function '${get.name}' not found`, '')
                }
            }
        } else if (get instanceof new_get_tree) {
            if (get.name.includes('.')) {
                this.check_dotted_access(get.name, 'type')
            } else {
                let resolved = this.resolve_type_name(get.name)
                if (!resolved) {
                    this.log.error(`Class '${get.name}' not found`, '')
                }
            }
        } else if (get instanceof chain_get_tree) {
            for (let item of get.chain) {
                this.check_get(item)
            }
        }
    }
    private check_call(call: call_tree): void {
        if (call.name.includes('.')) {
            this.check_dotted_access(call.name, 'function')
        } else {
            let resolved = this.resolve_function_name(call.name)
            if (!resolved) {
                this.log.error(`Function '${call.name}' not found`, '')
            }
        }
    }

    private check_dotted_access(full_name: string, expected_kind: string): void {
        let parts = full_name.split('.')
        let alias_or_var = parts[0]

        let current_module_path: string | null = null

        if (this.imported_modules.has(alias_or_var)) {
            current_module_path = this.imported_modules.get(alias_or_var)
        } else {
            let var_found = this.find_variable_in_scope(alias_or_var)
            if (!var_found) {
                this.log.error(`'${alias_or_var}' is not an imported module or variable`, '')
                return
            }
        }

        for (let i = 1; i < parts.length; i++) {
            let member_name = parts[i]
            let target_module = current_module_path ? this.module_registry.get(current_module_path) : null

            if (target_module && target_module.children) {
                let found = false
                for (let child of target_module.children) {
                    if (child.name === member_name) {
                        if (i === parts.length - 1) {
                            if (expected_kind === 'function' && !(child instanceof func_tree)) {
                                this.log.error(`'${member_name}' is not a function`, '')
                            } else if (expected_kind === 'type' && !(child instanceof class_tree)) {
                                this.log.error(`'${member_name}' is not a class`, '')
                            }
                        }

                        if (child instanceof module_tree) {
                            current_module_path = this.get_full_name(child)
                        } else {
                            current_module_path = null
                        }
                        found = true
                        break
                    }
                }

                if (!found) {
                    this.log.error(`Member '${member_name}' not found`, '')
                    return
                }
            } else {
                this.log.error(`Cannot access member '${member_name}'`, '')
                return
            }
        }
    }

    private find_variable_in_scope(name: string): boolean {
        for (let i = this.current_scope.length - 1; i >= 0; i--) {
            let scope = this.current_scope[i]

            if (scope instanceof func_tree) {
                for (let param of scope.params.param) {
                    if (param.key === name) {
                        return true
                    }
                }
            }

            if (scope.children) {
                for (let child of scope.children) {
                    if (child.name === name) {
                        return true
                    }
                }
            }
        }

        return false
    }
    private register_nested_modules(parent: module_tree): void {
        for (let child of parent.children) {
            if (child instanceof module_tree) {
                let full_name = this.get_full_name(child)
                if (this.module_registry.has(full_name)) {
                    this.log.error(`Duplicate module name '${full_name}'`, '')
                    continue
                }
                this.module_registry.set(full_name, child)
                this.register_nested_modules(child)
            }
        }
    }
    private get_full_name(space: space_tree): string {
        let names: string[] = [space.name]

        for (let i = this.current_scope.length - 1; i >= 0; i--) {
            names.unshift(this.current_scope[i].name)
        }

        return names.join('.')
    }

    private check_file(file: file_tree): void {
        this.imported_modules.clear()

        for (let imp of file.imports) {
            this.check_import(imp, file)
        }

        for (let space of file.spaces) {
            if (space instanceof module_tree) {
                this.check_module(space)
            }
        }
    }

    private check_import(imp: import_tree, file: file_tree): void {
        if (this.imported_modules.has(imp.name)) {
            this.log.error(`Duplicate import alias '${imp.name}'`, '')
            return
        }

        let source_module = this.module_registry.get(imp.module)
        if (!source_module) {
            this.log.error(`Imported module '${imp.module}' does not exist`, '')
            return
        }

        this.imported_modules.set(imp.name, imp.module)
    }

    private check_space(space: space_tree, parent: space_tree | null): void {
        this.validate_nesting_rules(space, parent)

        this.current_scope.push(space)

        if (space instanceof module_tree) {
            this.check_module(space)
        } else if (space instanceof class_tree) {
            this.check_class(space)
        } else if (space instanceof interface_tree) {
            this.check_interface(space)
        } else if (space instanceof enum_tree) {
            this.check_enum(space)
        } else if (space instanceof func_tree) {
            this.check_func(space)
        } else if (space instanceof var_tree) {
            this.check_var_declaration(space)
        }

        this.current_scope.pop()
    }

    private validate_nesting_rules(space: space_tree, parent: space_tree | null): void {
        if (!parent) return

        if (parent instanceof class_tree && space instanceof module_tree) {
            this.log.error(`Cannot define module inside class '${parent.name}'`, '')
        }

        if (parent instanceof interface_tree && space instanceof module_tree) {
            this.log.error(`Cannot define module inside interface '${parent.name}'`, '')
        }

        if (parent instanceof enum_tree && space instanceof module_tree) {
            this.log.error(`Cannot define module inside enum '${parent.name}'`, '')
        }

        if (parent instanceof func_tree && space instanceof module_tree) {
            this.log.error(`Cannot define module inside function '${parent.name}'`, '')
        }

        if (parent instanceof class_tree && space instanceof interface_tree) {
            this.log.error(`Cannot define interface inside class '${parent.name}'`, '')
        }

        if (parent instanceof class_tree && space instanceof enum_tree) {
            this.log.error(`Cannot define enum inside class '${parent.name}'`, '')
        }
    }

    private check_module(module: module_tree): void {
        for (let child of module.children) {
            this.check_space(child, module)
        }
    }

    private check_class(cls: class_tree): void {
        if (cls.implements) {
            let resolved_name = this.resolve_type_name(cls.implements)
            if (!resolved_name) {
                this.log.error(`Interface '${cls.implements}' not found`, '')
            } else {
                let iface = this.module_registry.get(resolved_name)
                if (!iface || !(iface instanceof interface_tree)) {
                    this.log.error(`'${cls.implements}' is not an interface`, '')
                }
            }
        }

        for (let child of cls.children) {
            this.check_space(child, cls)
        }
    }

    private check_interface(iface: interface_tree): void {
        for (let func of iface.func) {
            this.check_func_signature(func)
        }
    }

    private check_enum(enm: enum_tree): void {
        let values = new Set<string>()
        for (let value of enm.values) {
            if (values.has(value)) {
                this.log.error(`Duplicate enum value '${value}'`, '')
            }
            values.add(value)
        }
    }

    private check_func(func: func_tree): void {
        this.check_type(func.return_type)

        for (let param of func.params.param) {
            this.check_type(param.value)
        }

        if (func.commands) {
            this.check_commands(func.commands, func)
        }
    }

    private check_func_signature(func: func_tree): void {
        this.check_type(func.return_type)
        for (let param of func.params.param) {
            this.check_type(param.value)
        }
    }

    private check_var_declaration(varDecl: var_tree): void {
        this.check_type(varDecl.var_type)
        if (varDecl.value) {
            this.check_get_node(get_node_tree.create([varDecl.value]))
        }
    }
    private check_type(type: type_tree): boolean {
        if (!type) {
            this.log.error('Type is null', '')
            return false
        }

        if (type instanceof basic_type_tree) {
            return true
        } else if (type instanceof class_type_tree) {
            let resolved = this.resolve_type_name(type.type_name)
            if (!resolved) {
                this.log.error(`Type '${type.type_name}' not found`, '')
                return false
            }
            return true
        } else if (type instanceof array_type_tree) {
            return this.check_type(type.type_name)
        } else if (type instanceof lambda_type_tree) {
            for (let param of type.param) {
                this.check_type(param.value)
            }
            return this.check_type(type.return_type)
        }

        return true
    }

    private resolve_type_name(type_name: string): string | null {
        if (this.module_registry.has(type_name)) {
            return type_name
        }

        if (this.imported_modules.has(type_name)) {
            return this.imported_modules.get(type_name)
        }

        let parts = type_name.split('.')
        if (parts.length > 1) {
            return this.module_registry.has(type_name) ? type_name : null
        }

        for (let i = this.current_scope.length - 1; i >= 0; i--) {
            let scope = this.current_scope[i]
            let full_name = this.build_full_name(scope, type_name)
            if (this.module_registry.has(full_name)) {
                return full_name
            }
        }

        return null
    }

    private build_full_name(scope: space_tree, name: string): string {
        let names: string[] = [name]
        let current: space_tree = scope

        for (let i = this.current_scope.indexOf(scope); i >= 0; i--) {
            names.unshift(this.current_scope[i].name)
        }

        return names.join('.')
    }

    private check_commands(commands: command_tree[], current_func: func_tree): void {
        for (let cmd of commands) {
            this.check_command(cmd, current_func)
        }
    }

    private check_command(cmd: command_tree, current_func: func_tree): void {
        if (cmd instanceof var_tree) {
            this.check_var_declaration(cmd)
        } else if (cmd instanceof identifier_var_tree) {
            this.check_type(cmd.identifier.value)
            if (cmd.value) {
                this.check_get_node(cmd.value)
            }
        } else if (cmd instanceof set_tree) {
            this.check_get_node(cmd.value)
        } else if (cmd instanceof return_tree) {
            if (cmd.value) {
                this.check_get_node(cmd.value)
            }
        } else if (cmd instanceof call_tree) {
            this.check_call(cmd)
        } else if (cmd instanceof break_tree) {
            // Check if inside loop or switch
        } else if (cmd instanceof command_tree) {
            if (cmd.commands) {
                this.check_commands(cmd.commands, current_func)
            }
        }
    }
    private build_module_registry(): void {
        for (let file of this.data) {
            let file_modules = new Set<string>()

            for (let space of file.spaces) {
                if (!(space instanceof module_tree)) {
                    this.log.error(`File level can only define modules, not '${space.name}'`, '')
                    continue
                }

                if (this.module_registry.has(space.name)) {
                    this.log.error(`Duplicate module name '${space.name}'`, '')
                    continue
                }

                this.module_registry.set(space.name, space)
                file_modules.add(space.name)
                this.register_nested_modules(space)
            }

            this.file_module_map.set(file, file_modules)
        }
    }
    private resolve_function_name(name: string): string | null {
        for (let i = this.current_scope.length - 1; i >= 0; i--) {
            let scope = this.current_scope[i]
            if (scope.children) {
                for (let child of scope.children) {
                    if (child.name === name && child instanceof func_tree) {
                        return this.build_full_name(scope, name)
                    }
                }
            }
        }

        if (this.imported_modules.has(name)) {
            return this.imported_modules.get(name)
        }

        return null
    }

    private check_get_node(node: get_node_tree): void {
        if (!node || !node.tree) return

        for (let item of node.tree.chain) {
            this.check_get(item)
        }
    }
    private check_variable_access(name: string): void {
        if (name === 'up') {
            return
        }

        if (name.startsWith('up.')) {
            let parts = name.split('.')
            let up_count = 0
            let i = 0
            while (i < parts.length && parts[i] === 'up') {
                up_count++
                i++
            }

            if (up_count >= this.current_scope.length) {
                this.log.error(`Cannot access ${up_count} levels up, only ${this.current_scope.length - 1} levels available`, '')
            }
            return
        }

        let found = false
        for (let i = this.current_scope.length - 1; i >= 0; i--) {
            let scope = this.current_scope[i]

            if (scope instanceof func_tree) {
                for (let param of scope.params.param) {
                    if (param.key === name) {
                        found = true
                        break
                    }
                }
            }

            if (scope.children) {
                for (let child of scope.children) {
                    if (child.name === name) {
                        found = true
                        break
                    }
                }
            }

            if (found) break
        }

        if (!found && !this.module_registry.has(name) && !this.imported_modules.has(name)) {
            this.log.error(`Variable '${name}' not found`, '')
        }
    }
}
