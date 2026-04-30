import {segment} from 'allang-compiler-base'
import tokens from './tokens'
import allang_tools from './allang_tools'
import {match} from './parser'
import allang_log from './allang_log'
import {check} from './check'
let code = `
@ABC()
public b:class{
}
`
let a = new segment(code, tokens)
let ls = a.segment()
let t = new allang_tools(ls)
let __ls=new check([match(t,new allang_log())],new allang_log())