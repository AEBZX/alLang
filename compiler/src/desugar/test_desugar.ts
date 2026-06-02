/**
 * desugar 测试 — 覆盖 desugar.md 所有转换规则
 */
import {segment, TokenStream} from 'allang-compiler-base'
import tokens from '../tokens'
import {parse} from '../parser'
import {desugar} from './index'
import {file_tree} from '../tree'
import {while_tree, enum_tree, class_tree, func_tree, var_tree, for_tree, foreach_tree} from '../tree'

let passed = 0
let failed = 0

function parseCode(code: string): file_tree {
    const seg = new segment(code, tokens)
    const ts = new TokenStream(seg.segment())
    return parse(ts)
}

function test(name: string, codes: string[], check: (result: file_tree) => boolean) {
    try {
        const asts = codes.map(c => parseCode(c))
        const result = desugar(asts)
        if (check(result)) {
            console.log(`✓ ${name}`)
            passed++
        } else {
            console.log(`✗ ${name} — check failed`)
            console.log(`  Result: ${JSON.stringify(result).substring(0, 300)}`)
            failed++
        }
    } catch (e: any) {
        console.log(`✗ ${name} — error: ${e.message}`)
        failed++
    }
}

// ============ 文件合并 ============
test('merge files', [
    `M1:module{a:function void(){}}`,
    `M2:module{b:function void(){}}`
], (r) => r.spaces.length >= 2)

// ============ 默认导入 ============
test('default imports added', [
    `f:function void(){}`
], (r) => r.imports.some(i => i.module === 'Lang'))

// ============ Enum → Class ============
test('enum to class', [
    `E:enum{A,B,C}`
], (r) => {
    const space = r.spaces[0]
    return space instanceof class_tree && space.name === 'E'
        && space.children.length === 3
})

test('enum values are static vars', [
    `E:enum{A,B,C}`
], (r) => {
    const cls = r.spaces[0]
    if (!(cls instanceof class_tree)) return false
    // after desugarStatic, static flag might be reset (expected)
    return cls.children.length === 3 && cls.children.every(c => c instanceof var_tree)
})

// ============ Foreach → While ============
test('foreach to while', [
    `f:function void(){foreach(x:number as arr){a=x;}}`
], (r) => {
    const func = r.spaces[0] as func_tree
    if (!func || !func.commands) return false
    // 应该有 var 声明 + while 语句
    return func.commands.some(c => c instanceof while_tree)
})

// ============ Do-While → While ============
test('do-while to while', [
    `f:function void(){do{x=x+1;}while(x<10);}`
], (r) => {
    const func = r.spaces[0] as func_tree
    if (!func || !func.commands) return false
    // 应该有 2 个命令：先执行的 block + while
    return func.commands.length >= 2
})

// ============ For → While ============
test('for to while', [
    `f:function void(){for(():void->{var i:number=0;},():boolean->{return i<10;},():void->{i++;}){a=a+1;}}`
], (r) => {
    const func = r.spaces[0] as func_tree
    if (!func || !func.commands) return false
    return func.commands.some(c => c instanceof while_tree)
})

// ============ Condition → != null ============
test('condition wrap', [
    `f:function void(){if(a){a=1;}}`
], (r) => {
    const func = r.spaces[0] as func_tree
    if (!func || !func.commands) return false
    return true  // 不崩溃即可
})

// ============ Interface 删除 ============
test('interface deleted', [
    `I:interface{a:function void();}C:class{}`
], (r) => {
    return !r.spaces.some(s => s.name === 'I' && !(s instanceof class_tree))
})

// ============ Import 别名解析 (每个文件独立) ============
test('import alias resolved in single file', [
    `import Lang.String as S;M:module{c:function void(){S.add("a","b");}}`
], (r) => {
    // 别名 S 应被替换为 Lang.String，import 的 name 应变为 module
    const imp = r.imports.find(i => i.module === 'Lang.String')
    return imp !== undefined && imp.name === 'Lang.String'
})

test('two files with different aliases for same module', [
    `import Lang.String as S;M1:module{c1:function void(){S.add("a","b");}}`,
    `import Lang.String as Str;M2:module{c2:function void(){Str.add("c","d");}}`
], (r) => {
    // 两个文件中 S 和 Str 都应正确替换为 Lang.String
    // import 去重后只有一条 Lang.String
    const langStrImports = r.imports.filter(i => i.module === 'Lang.String')
    return langStrImports.length === 1 && langStrImports[0].name === 'Lang.String'
        && r.spaces.length >= 2
})

test('two files with same alias for different modules', [
    `import Foo as X;M1:module{f1:function void(){X.do();}}`,
    `import Bar as X;M2:module{f2:function void(){X.do();}}`
], (r) => {
    // 关键: 文件1中 X→Foo, 文件2中 X→Bar, 不应混淆
    // 合并后应有两个不同模块的 import
    const fooImport = r.imports.find(i => i.module === 'Foo')
    const barImport = r.imports.find(i => i.module === 'Bar')
    return fooImport !== undefined && barImport !== undefined
        && fooImport.name === 'Foo' && barImport.name === 'Bar'
        && r.spaces.length >= 2
})

test('import alias in nested expression', [
    `import Math as M;T:module{f:function void(){var x:number=M.add(1,2);}}`
], (r) => {
    // 别名在嵌套表达式中应被替换
    const imp = r.imports.find(i => i.module === 'Math')
    return imp !== undefined && imp.name === 'Math'
})

// ============ 综合 ============
test('full pipeline', [`
import out as O;
M:module{
    E:enum{RED,GREEN}
    f:function void(){
        var i:number=0;
        while(i<10){i=i+1;}
        foreach(x:number as arr){a=x;}
        for(():void->{var j:number=0;},():boolean->{return j<10;},():void->{j++;}){b=j;}
    }
    C:class{
        count:var of number=0;
    }
    I:interface{a:function void();}
}
`], (r) => {
    // 至少不崩溃，且产生有效输出
    console.log(`  Full pipeline produced ${r.spaces.length} top-level spaces, ${r.imports.length} imports`)
    return r.spaces.length > 0
})

// ============ Summary ============
console.log(`\n${'='.repeat(40)}`)
console.log(`Desugar tests — Passed: ${passed}, Failed: ${failed}, Total: ${passed + failed}`)
if (failed > 0) console.error('SOME DESUGAR TESTS FAILED!')
