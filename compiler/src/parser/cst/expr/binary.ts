import prefix from './prefix'
import {loop_match, or_match, order_match, token_name_match, token_type_match, while_match} from '../lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import {expr} from './index'
export function multi_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,prefix(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        prefix(tool),
                        token_name_match(tool,'*'),
                        prefix(tool)),
                    order_match(tool,
                        prefix(tool),
                        token_name_match(tool,'/'),
                        prefix(tool)),
                    order_match(tool,
                        prefix(tool),
                        token_name_match(tool,'%'),
                        prefix(tool)
                    )
                )
        )
    ),prefix(tool))
}
export function additive_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,multi_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        multi_expr(tool),
                        token_name_match(tool,'+'),
                        multi_expr(tool)),
                    order_match(tool,
                        multi_expr(tool),
                        token_name_match(tool,'-'),
                        multi_expr(tool)
                    )
                )
        )
    ),multi_expr(tool))
}
export function shift_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,additive_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        additive_expr(tool),
                        token_name_match(tool,'<<'),
                        additive_expr(tool)),
                    order_match(tool,
                        additive_expr(tool),
                        token_name_match(tool,'>>'),
                        additive_expr(tool)
                    )
                )
        )
    ),additive_expr(tool))
}
export function relational_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,shift_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        shift_expr(tool),
                        token_name_match(tool,'<'),
                        shift_expr(tool)),
                    order_match(tool,
                        shift_expr(tool),
                        token_name_match(tool,'>'),
                        shift_expr(tool)),
                    order_match(tool,
                        shift_expr(tool),
                        token_name_match(tool,'<='),
                        shift_expr(tool)),
                    order_match(tool,
                        shift_expr(tool),
                        token_name_match(tool,'>='),
                        shift_expr(tool))
                )
        )
    ),shift_expr(tool))
}
export function equality_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,relational_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        relational_expr(tool),
                        token_name_match(tool,'=='),
                        relational_expr(tool)),
                    order_match(tool,
                        relational_expr(tool),
                        token_name_match(tool,'!='),
                        relational_expr(tool))
                )
        )
    ),relational_expr(tool))
}
export function bit_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,equality_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        equality_expr(tool),
                        token_name_match(tool,'&'),
                        equality_expr(tool)),
                    order_match(tool,
                        equality_expr(tool),
                        token_name_match(tool,'|'),
                        equality_expr(tool)),
                    order_match(tool,
                        equality_expr(tool),
                        token_name_match(tool,'^'),
                        equality_expr(tool))
                )
        )
    ),equality_expr(tool))
}
export function logic_expr(tool:TokenStream){
    return or_match(tool,order_match(tool,bit_expr(tool),
        loop_match(tool,
                or_match(tool,
                    order_match(tool,
                        bit_expr(tool),
                        token_name_match(tool,'&&'),
                        bit_expr(tool)),
                    order_match(tool,
                        bit_expr(tool),
                        token_name_match(tool,'||'),
                        bit_expr(tool))
                )
        )
    ),bit_expr(tool))
}
export default function (tool:TokenStream){
    return logic_expr(tool)
}