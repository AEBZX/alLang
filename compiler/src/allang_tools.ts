import {token, tools, Tree} from 'allang-compiler-base'

export default class allang_tools implements tools {
    tokens: token[]
    buffer: Tree[]
    index: number
    back: allang_tools

    constructor(tokens: token[]) {
        this.tokens = tokens
        this.buffer = []
        this.index = 0
        this.back = null
    }

    add(tree: Tree): void {
        this.buffer.push(tree)
    }
    remove(): void {
        this.buffer.pop()
    }
    get(): Tree[] {
        return this.buffer
    }
    peek(): token {
        return this.tokens[this.index+1]?this.tokens[this.index+1]:null
    }
    now(): token {
        return this.tokens[this.index]?this.tokens[this.index]:null
    }
    next(): token {
        this.index++
        return this.tokens[this.index]?this.tokens[this.index]:null
    }
    getAndNext():token{
        return this.tokens[this.index]?this.tokens[this.index++]:null
    }
    backup(): void {
        this.back=this
    }
    restore(): void {
        this.index=this.back.index
        this.buffer=this.back.buffer
        this.tokens=this.back.tokens
        this.back=null
    }
    flush(): void {
        this.buffer=[]
    }
}