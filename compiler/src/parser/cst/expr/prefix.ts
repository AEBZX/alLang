import postfix from './postfix'
import {or_match, order_match, token_name_match, token_type_match, while_match} from '../lib'
import {TokenStream} from 'allang-compiler-base'
export default function (tool:TokenStream){
    return or_match(tool,
        order_match(tool,
            or_match(tool,
                token_name_match(tool,'!'),
                token_name_match(tool,'-'),
                token_name_match(tool,'~'),
                token_name_match(tool,'&'),
                token_name_match(tool,'*'),
                token_name_match(tool,'++'),
                token_name_match(tool,'--'),
                token_name_match(tool,'new')
            ),
            postfix(tool)
        ),
        postfix(tool)
    )
}