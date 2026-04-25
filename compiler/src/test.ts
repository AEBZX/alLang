import {segment} from 'allang-compiler-base'
import tokens from './tokens'
import allang_tools from './allang_tools'
import {match} from './parser'
import allang_log from './allang_log'

let code = `
{
a++;
continue;
}
`
let a = new segment(code, tokens)
let ls = a.segment()
let t = new allang_tools(ls)
console.log(match(t, new allang_log()))