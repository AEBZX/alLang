import {match_type, token, token_type, word} from './model'
import {match} from './match'
import segment from './segment'

export default {
    segment:segment,
    token:token,
    token_type:token_type,
    word:word,
    match_type:match_type
}
export {segment,token,token_type,word,match_type, match}