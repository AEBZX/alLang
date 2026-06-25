import {or_match, order_match, token_name_match, token_type_match} from '../lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import binary from './binary'
export function expr(tool:TokenStream):()=>any[]{
    return or_match(tool,order_match(tool,binary(tool),token_name_match(tool,'?'),
            expr(tool),token_name_match(tool,':'),expr(tool)),
        binary(tool))
}
export default function (tool:TokenStream):()=>any[]{
    return expr(tool)
}