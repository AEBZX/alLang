import {loop_match, or_match, order_match, token_name_match, token_type_match, while_match} from './lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import {_chain, args_iden, type} from './iden'
import {commands} from './command'
import expr from './expr'

export function link_block(tool:TokenStream):()=>any[]{
    return loop_match(tool,order_match(tool,
        token_name_match(tool,'link'),_chain(tool),token_name_match(tool,'as'),
        token_type_match(tool,token_type.identifier),token_name_match(tool,';')))
}
export function modifier_block(tool:TokenStream){
    return loop_match(tool,order_match(tool,
        token_name_match(tool,'static'),token_name_match(tool,'unstatic')
    ,token_name_match(tool,'public'),token_name_match(tool,'private')
    ,token_name_match(tool,'async'),token_name_match(tool,'sync')))
}
export function block(tool:TokenStream){
    return order_match(tool,token_name_match(tool,'{'),
        loop_match(tool,or_match(tool,func_block(tool),variable_block(tool),
            class_block(tool),interface_block(tool),enum_block(tool),module_block(tool),)),
        token_name_match(tool,'}'))
}
export function _block(tool:TokenStream,block:()=>any[]){
    return order_match(tool,modifier_block(tool),token_type_match(tool,token_type.identifier),
        token_name_match(tool,':')
        ,block)
}
export function func_block(tool:TokenStream){
    return _block(tool,order_match(tool,token_name_match(tool,'function'),
        type(tool),args_iden(tool),commands(tool)))
}
export function variable_block(tool:TokenStream){
    return _block(tool,or_match(tool,order_match(tool,token_name_match(tool,'variable'),
        type(tool),token_name_match(tool,'='),expr(tool)),
        order_match(tool,token_name_match(tool,'variable'),
            type(tool))))
}
export function class_block(tool:TokenStream){
    return _block(tool,order_match(tool,token_name_match(tool,'class'),block(tool)))
}
export function interface_block(tool:TokenStream){
    return _block(tool,order_match(tool,token_name_match(tool,'interface'),block(tool)))
}
export function enum_block(tool:TokenStream){
    return _block(tool,order_match(tool,token_name_match(tool,'enum'),
        while_match(tool,token_name_match(tool,'{'),token_type_match(tool,token_type.identifier),
            token_name_match(tool,','),token_name_match(tool,'}'))))
}
export function module_block(tool:TokenStream){
    return _block(tool,order_match(tool,token_name_match(tool,'module'),block(tool)))
}
export default function (tool:TokenStream){
    return order_match(tool,link_block(tool),module_block(tool))
}