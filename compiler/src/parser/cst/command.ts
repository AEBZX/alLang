import {loop_match, or_match, order_match, token_name_match, token_type_match} from './lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import {expr} from './expr'
import {theme_expr} from './expr/primary'
import {type} from './iden'
export function inc_command(tool:TokenStream):()=>any[]{
    return order_match(tool,
        expr(tool),token_name_match(tool,'++'))
}
export function dec_command(tool:TokenStream):()=>any[]{
    return order_match(tool,
        expr(tool),token_name_match(tool,'--'))
}
export function _set_expr(tool:TokenStream,token:string){
    return order_match(tool,expr(tool),token_name_match(tool,token),expr(tool))
}
export function set_command(tool:TokenStream){
    return or_match(tool,_set_expr(tool,'='),_set_expr(tool,'+='),_set_expr(tool,'-='),
        _set_expr(tool,'*='),_set_expr(tool,'/='),_set_expr(tool,'%='),
        _set_expr(tool,'<<='),_set_expr(tool,'>>='),_set_expr(tool,'&='),
        _set_expr(tool,'^='),_set_expr(tool,'|='),_set_expr(tool,'&&='),
        _set_expr(tool,'||='))
}
export function throw_command(tool:TokenStream):()=>any[]{
    return order_match(tool,token_name_match(tool,'throw'),expr(tool))
}
export function return_command(tool:TokenStream):()=>any[]{
    return order_match(tool,
        order_match(tool,token_name_match(tool,'return'),expr(tool),
            token_name_match(tool,'return')))
}
export function vm_command(tool:TokenStream):()=>any[]{
    return order_match(tool,
        token_name_match(tool,'vm'),token_type_match(tool,token_type.string))
}
export function call_command(tool:TokenStream):()=>any[]{
    return order_match(tool,or_match(tool,
        order_match(tool,token_name_match(tool,'await'),expr(tool)),expr(tool)))
}
export function var_command(tool:TokenStream):()=>any[]{
    return order_match(tool,
        token_name_match(tool,'var'),token_type_match(tool,token_type.identifier),
        token_name_match(tool,':'),type(tool),
        token_name_match(tool,'='),expr(tool))
}
export function command(tool:TokenStream){
    return order_match(tool,or_match(tool,
        inc_command(tool),dec_command(tool),set_command(tool),
        throw_command(tool),return_command(tool),vm_command(tool),
        call_command(tool),var_command(tool),if_command(tool),
        switch_command(tool),while_command(tool),do_while_command(tool),
            for_command(tool),foreach_command(tool),try_command(tool)),
        token_name_match(tool,';'))
}
export function commands(tool:TokenStream){
    return or_match(tool,order_match(tool,token_name_match(tool,'{'),
        loop_match(tool,command(tool)),token_name_match(tool,'}')),
        command(tool))
}
export function if_command(tool:TokenStream){
    return order_match(tool,
        token_name_match(tool,'if'),theme_expr(tool),commands(tool),
        token_name_match(tool,'else'),commands(tool))
}
export function switch_command(tool:TokenStream){
    return or_match(tool,order_match(tool,token_name_match(tool,'switch'),theme_expr(tool),
        token_name_match(tool,'{'),
        or_match(tool,loop_match(tool,
                order_match(tool,
                    token_name_match(tool,'case'),expr(tool),token_name_match(tool,'=>'),commands(tool))),
            order_match(tool,loop_match(tool,
                    order_match(tool,token_name_match(tool,'case'),expr(tool),token_name_match(tool,'=>')
                        ,commands(tool))),
                token_name_match(tool,'default'),token_name_match(tool,'=>'),commands(tool))),
        token_name_match(tool,'}')))
}
export function while_command(tool:TokenStream){
    return order_match(tool,
        token_name_match(tool,'while'),theme_expr(tool),commands(tool))
}
export function do_while_command(tool:TokenStream){
    return order_match(tool,
        token_name_match(tool,'do'),commands(tool),
        token_name_match(tool,'while'),theme_expr(tool),token_name_match(tool,';'))
}
export function for_command(tool:TokenStream){
    return order_match(tool,token_name_match(tool,'for'),
        token_name_match(tool,'('),loop_match(tool,
            order_match(tool,var_command(tool),token_name_match(tool,';'))),
        expr(tool),token_name_match(tool,';'),loop_match(tool,command(tool)),
        token_name_match(tool,')')
        ,commands(tool))
}
export function foreach_command(tool:TokenStream){
    return order_match(tool,token_name_match(tool,'foreach'),
        token_name_match(tool,'('),loop_match(tool,
            order_match(tool,var_command(tool),token_name_match(tool,'in'))),
        expr(tool),token_name_match(tool,')')
        ,commands(tool))
}
export function try_command(tool:TokenStream){
    return order_match(tool,token_name_match(tool,'try'),commands(tool),
        token_name_match(tool,'catch'),token_name_match(tool,'('),
        var_command(tool),token_name_match(tool,')'),commands(tool),
        token_name_match(tool,'finally'),commands(tool))
}
export default function (tool:TokenStream){
    return commands(tool)
}