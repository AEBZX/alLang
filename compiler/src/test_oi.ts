/**
 * ObjectInterface 专项测试
 */
import {segment, TokenStream} from 'allang-compiler-base'
import tokens from './tokens'
import {parse} from './parser'
import {class_tree, interface_tree} from './tree'

let passed = 0, failed = 0

function parseCode(code: string) {
    const seg = new segment(code, tokens)
    const ts = new TokenStream(seg.segment())
    return parse(ts)
}

function test(name: string, code: string, check: (ast: any) => boolean) {
    try {
        const ast = parseCode(code)
        if (check(ast)) { console.log(`✓ ${name}`); passed++ }
        else { console.log(`✗ ${name}`); failed++ }
    } catch(e: any) { console.log(`✗ ${name} — ${e.message}`); failed++ }
}

// 1. 普通class → Lang.ObjectInterface
test('class no implements → Lang.ObjectInterface', `C:class{}`, (ast) => {
    const c = ast.spaces[0]
    return c instanceof class_tree && c.implements === 'Lang.ObjectInterface'
})

// 2. class implements x → 保持x
test('class implements X → keeps X', `C:class implements X{}`, (ast) => {
    const c = ast.spaces[0]
    return c instanceof class_tree && c.implements === 'X'
})

// 3. class named ObjectInterface → empty
test('class ObjectInterface → empty implements', `ObjectInterface:class{}`, (ast) => {
    const c = ast.spaces[0]
    return c instanceof class_tree && c.implements === ''
})

// 4. 普通interface → Lang.ObjectInterface
test('interface no of → Lang.ObjectInterface', `I:interface{}`, (ast) => {
    const i = ast.spaces[0]
    return i instanceof interface_tree && i.of === 'Lang.ObjectInterface'
})

// 5. interface of X → 保持X
test('interface of X → keeps X', `I:interface of X{}`, (ast) => {
    const i = ast.spaces[0]
    return i instanceof interface_tree && i.of === 'X'
})

// 6. interface named ObjectInterface → empty of
test('interface ObjectInterface → empty of', `ObjectInterface:interface{}`, (ast) => {
    const i = ast.spaces[0]
    return i instanceof interface_tree && i.of === ''
})

// 7. 模块内的class
test('module class defaults ok', `M:module{C:class{}}`, (ast) => {
    const m = ast.spaces[0]
    if (!m || !m.children) return false
    const c = m.children[0]
    return c instanceof class_tree && c.implements === 'Lang.ObjectInterface'
})

// 8. 类中嵌套class
test('nested class defaults ok', `C:class{Inner:class{}}`, (ast) => {
    const c = ast.spaces[0]
    if (!c || !c.children || c.children.length === 0) return false
    const inner = c.children[0]
    return inner instanceof class_tree && inner.implements === 'Lang.ObjectInterface'
})

// 9. Interface 含函数声明
test('interface with func still defaults', `I:interface{a:function void();}`, (ast) => {
    const i = ast.spaces[0]
    return i instanceof interface_tree && i.of === 'Lang.ObjectInterface'
})

// 10. class implements 全限路径
test('class implements full path', `C:class implements A.B.C{}`, (ast) => {
    const c = ast.spaces[0]
    return c instanceof class_tree && c.implements === 'A.B.C'
})

// 11. class implements Lang.ObjectInterface 显式 → 保持
test('class explicitly implements Lang.ObjectInterface', `C:class implements Lang.ObjectInterface{}`, (ast) => {
    const c = ast.spaces[0]
    return c instanceof class_tree && c.implements === 'Lang.ObjectInterface'
})

// 12. 模块内嵌套interface
test('module nested interface defaults', `M:module{I:interface{}}`, (ast) => {
    const m = ast.spaces[0]
    if (!m || !m.children) return false
    const i = m.children[0]
    return i instanceof interface_tree && i.of === 'Lang.ObjectInterface'
})

console.log(`\nObjectInterface tests — Passed: ${passed}, Failed: ${failed}, Total: ${passed + failed}`)
if (failed > 0) console.error('FAILURES!')
