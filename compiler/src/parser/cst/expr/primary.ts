import {or_match, order_match, token_name_match, token_type_match, while_match} from '../lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import {expr} from './index'
import {args_iden} from '../iden'
import command from '../command'
export function value_expr(tool:TokenStream){
    return or_match(tool,token_type_match(tool,token_type.number),
        token_type_match(tool,token_type.string),
        or_match(tool,token_name_match(tool,'true'),token_name_match(tool,'false')),
        token_name_match(tool,'null'))
}
export function iden_expr(tool:TokenStream){
    return token_type_match(tool,token_type.identifier)
}
export function theme_expr(tool:TokenStream){
    return order_match(tool,token_name_match(tool,'('),expr(tool),token_name_match(tool,')'))
}
export function array_expr(tool:TokenStream){
    return while_match(tool,token_name_match(tool,'['),
        expr(tool),token_name_match(tool,','),token_name_match(tool,']'))
}
export function lambda_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,args_iden(tool),token_name_match(tool,'=>'),expr(tool)),
        order_match(tool,args_iden(tool),token_name_match(tool,'=>'),command(tool)))
}
export function map_expr(tool:TokenStream){
    return while_match(tool,token_name_match(tool,'{'),
        order_match(tool,expr(tool),token_name_match(tool,':'),expr(tool)),
        token_name_match(tool,','),token_name_match(tool,'}'))
}
export default function primary_expr(tool:TokenStream){
    return or_match(tool,value_expr(tool),
        iden_expr(tool),
        theme_expr(tool),
        array_expr(tool),
        lambda_expr(tool),
        map_expr(tool))
}