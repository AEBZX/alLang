import primary from './primary'
import {loop_match, or_match, order_match, token_name_match, token_type_match, while_match} from '../lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import {expr} from './index'

export default function (tool:TokenStream):()=>any[]{
    return or_match(tool,order_match(tool,primary(tool),
        loop_match(tool,
            or_match(tool,
                or_match(tool,
                    token_name_match(tool,'++'),
                    token_name_match(tool,'--'),
                    order_match(tool,token_name_match(tool,'.'),token_type_match(tool,token_type.identifier))),
                order_match(tool,token_name_match(tool,'['),expr(tool),token_name_match(tool,']')),
                while_match(tool,
                    token_name_match(tool,'('),
                    expr(tool),token_name_match(tool,','),
                    token_name_match(tool,')')
                )
            )
        )
    ),primary(tool))
}