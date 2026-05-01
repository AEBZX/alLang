import {segment} from 'allang-compiler-base'
import tokens from './tokens'
import allang_tools from './allang_tools'
import {match} from './parser'
import allang_log from './allang_log'
import {check} from './check'
let code = `
`
let a = new segment(code, tokens)
let ls = a.segment()
let t = new allang_tools(ls)
let ret = match(t, new allang_log())
console.log(ret)
let che = new check([ret], new allang_log())
che.check_all()