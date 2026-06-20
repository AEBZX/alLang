import command from './oper'
import {TokenStream} from 'allang-compiler-base'
import {CommandTree} from '../../tree'
import allang_log from '../../base/allang_log'
import control from './control'
import {_set_commands_expr} from '../expr/primary'
export function command_expr(tool:TokenStream){
    let a=command(tool)
    if(a==null)return control(tool)
    if(tool.now().name!=';')allang_log.error('缺少分号',tool.now().line)
    tool.next()
    return a
}
export function commands_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name=='{') {
        tool.next()
        if (tool.now().name == '}') {
            tool.next()
            return []
        }
        let a: CommandTree[] = []
        while (true) {
            a.push(command_expr(tool))
            if (a[a.length - 1] == null) {
                a.pop()
                break
            }
        }
        return a
    }
    let a=command_expr(tool)
    return a==null?null:[a]
}
// 注册 commands_expr 到 primary 模块，打破循环依赖
_set_commands_expr(commands_expr)