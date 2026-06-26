import file from './block'
import {TokenStream} from 'allang-compiler-base'
export default function (tool:TokenStream){
    return file(tool)()
}