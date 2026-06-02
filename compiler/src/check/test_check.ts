/**
 * checker 测试 — 覆盖 check.md 所有规则
 */
import {segment, TokenStream} from 'allang-compiler-base'
import tokens from '../tokens'
import {parse} from '../parser'
import {checkWithResult, CheckResult} from './index'
import {file_tree} from '../tree'

let passed = 0
let failed = 0

function parseCode(code: string): file_tree {
    const seg = new segment(code, tokens)
    const ts = new TokenStream(seg.segment())
    return parse(ts)
}

// 期望无错误（运行通过）
function testPass(name: string, codes: string[]) {
    try {
        const asts = codes.map(c => parseCode(c))
        const result = checkWithResult(asts)
        if (result.hasErrors()) {
            console.log(`✗ ${name} — 应有0错误，实际有 ${result.errors.length} 个`)
            console.log(`   ${result.errors.join('; ')}`)
            failed++
        } else {
            console.log(`✓ ${name}`)
            passed++
        }
    } catch (e: any) {
        console.log(`✗ ${name} — 异常: ${e.message}`)
        failed++
    }
}

// 期望有错误
function testFail(name: string, codes: string[], expectedMsg?: string) {
    try {
        const asts = codes.map(c => parseCode(c))
        const result = checkWithResult(asts)
        if (!result.hasErrors()) {
            console.log(`✗ ${name} — 应有错误但通过`)
            failed++
        } else if (expectedMsg && !result.errors.some(e => e.includes(expectedMsg))) {
            console.log(`✗ ${name} — 错误信息不匹配`)
            console.log(`   期望包含: ${expectedMsg}`)
            console.log(`   实际错误: ${result.errors.join('; ')}`)
            failed++
        } else {
            console.log(`✓ ${name}`)
            passed++
        }
    } catch (e: any) {
        console.log(`✗ ${name} — 异常: ${e.message}`)
        failed++
    }
}

// ============ 修饰符检查 ============
testPass('class without async modifier ok', [`C:class{}`])
testPass('class with async modifier warns but ok', [`C:class{async f:function void(){}}`])

// ============ 嵌套规则 ============
testPass('module can contain module', [`M1:module{M2:module{}}`])
testFail('class cannot contain module', [`C:class{M:module{}}`], '不能')

// ============ 命名冲突 ============
testPass('different names ok', [`M:module{a:function void(){}b:function void(){}}`])
testFail('same non-module name', [`M:module{a:function void(){}a:function void(){}}`], '重复声明')
testPass('function overloading ok', [`M:module{a:function void(){}a:function void(x:number){}}`])
testFail('function same params', [`M:module{a:function void(x:number){}a:function void(x:number){}}`], '重复声明')

// ============ Class implements ============
testFail('class missing implements', [`I:interface{a:function void();}C:class implements I{}`], '未实现')

// ============ void 函数 return value ============
testPass('void function return value warns', [`f:function void(){return 1;}`])

// ============ break/continue ============
testFail('break outside loop', [`f:function void(){break;}`], 'break')
testFail('continue outside loop', [`f:function void(){continue;}`], 'continue')
testPass('break in while ok', [`f:function void(){while(true){break;}}`])
testPass('continue in for ok', [`f:function void(){for(():void->{},():boolean->{return true;},():void->{}){continue;}}`])

// ============ any 类型 ============
testFail('any type var error', [`f:function void(){var x:any=1;}`], 'any')

// ============ import 规则 ============
testFail('import same alias', [`import a as X;import b as X;`], '相同别名')
testPass('import same module different aliases ok', [`import a as X;import a as Y;`])
testFail('import same module without alias multiple times', [`import a;import a;`], '多次 import')

// ============ 模块合并 ============
testPass('module merge ok', [
    `M:module{a:function void(){}}`,
    `M:module{b:function void(){}}`
])
testFail('module merge conflict', [
    `M:module{a:function void(){}}`,
    `M:module{a:function void(){}}`
], '重复声明')

// ============ 综合测试 ============
testPass('complex ok', [`
M:module{
    public C:class{
        public count:var of number=0;
        public inc:function void(){
            count=count+1;
        }
    }
    public f:function void(x:number){
        var y:number=0;
        if(x>0){
            y=1;
        }
        while(y<10){
            y=y+1;
            if(y>5){break;}
        }
        return;
    }
}`])

// ============ 多文件同名模块 ============
testPass('multi-file same module', [
    `M:module{a:function void(){}}`,
    `M:module{b:function number(){return 1;}}`
])

// ============ Summary ============
console.log(`\n${'='.repeat(40)}`)
console.log(`Checker tests — Passed: ${passed}, Failed: ${failed}, Total: ${passed + failed}`)
if (failed > 0) {
    console.error('SOME CHECKER TESTS FAILED!')
}
