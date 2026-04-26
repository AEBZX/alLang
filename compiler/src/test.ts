import {segment} from 'allang-compiler-base'
import tokens from './tokens'
import allang_tools from './allang_tools'
import {match} from './parser'
import allang_log from './allang_log'
import {sugar} from './generate/sugar'
let code = `
import a as b;
public a:module{
}
`
let a = new segment(code, tokens)
let ls = a.segment()
let t = new allang_tools(ls)
sugar(t, new allang_log())