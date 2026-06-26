import {TokenStream} from 'allang-compiler-base'
import entry from './block'

export default function(tokens:TokenStream){
    return entry(tokens).match()
}