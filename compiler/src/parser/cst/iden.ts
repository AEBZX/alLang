import {loop_match, or_match, order_match, token_name_match, token_type_match, while_match} from './lib'
import {token_type, TokenStream} from 'allang-compiler-base'

export function basic_type(tool:TokenStream){
    return order_match(tool,
        token_name_match(tool,'string'),
        token_name_match(tool,'number'),
        token_name_match(tool,'void'),
        token_name_match(tool,'boolean'),
        lambda_type(tool),
        _chain(tool),
        order_match(tool,token_name_match(tool,'('),type(tool),token_name_match(tool,')'))
    )
}
export function _chain(tool:TokenStream){
    return while_match(tool,token_type_match(tool,token_type.identifier),
        token_name_match(tool,'.'),token_type_match(tool,token_type.identifier),
        token_type_match(tool,token_type.identifier))
}
export function args_iden(tool:TokenStream){
    return while_match(tool,token_name_match(tool,'('),order_match(tool,
        token_type_match(tool,token_type.identifier),
        token_name_match(tool,':'),
        type(tool)
    ),token_name_match(tool,','),token_name_match(tool,')'))
}
export function lambda_type(tool:TokenStream){
    return order_match(tool,args_iden(tool),token_name_match(tool,'=>'),type(tool))
}
export function type(tool:TokenStream){
    return or_match(tool,order_match(tool,
        basic_type(tool),
        loop_match(tool,
            or_match(tool,token_name_match(tool,'{}'),
                token_name_match(tool,'[]'),token_name_match(tool,'*'))
        )
    ),basic_type(tool))
}