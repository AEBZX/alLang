import {segment, TokenStream} from 'allang-compiler-base'
import Tokens from '../src/base/tokens'
export function getStream(code:string):TokenStream{
    return new TokenStream(new segment(code,Tokens).segment())
}