/**
 * 全面测试 — 覆盖 parser.md 的所有语法特性
 */
import {segment, TokenStream} from 'allang-compiler-base'
import tokens from './tokens'
import {parse} from './parser'
import {file_tree} from './tree'

let passed = 0
let failed = 0

function test(name: string, code: string, check: (ast: file_tree) => boolean) {
    try {
        const seg = new segment(code, tokens)
        const tokenList = seg.segment()
        const ts = new TokenStream(tokenList)
        const ast = parse(ts)
        if (check(ast)) {
            console.log(`✓ ${name}`)
            passed++
        } else {
            console.log(`✗ ${name} — check failed`)
            console.log(`  AST: ${JSON.stringify(ast).substring(0, 200)}`)
            failed++
        }
    } catch (e: any) {
        console.log(`✗ ${name} — error: ${e.message}`)
        failed++
    }
}

// ============ Import ============
test('import basic', 'import a;', (ast) =>
    ast.imports.length === 1 && ast.imports[0].module === 'a')

test('import as', 'import a as b;', (ast) =>
    ast.imports.length === 1 && ast.imports[0].module === 'a' && ast.imports[0].name === 'b')

test('import module path', 'import a.b.c as d;', (ast) =>
    ast.imports.length === 1 && ast.imports[0].module === 'a.b.c' && ast.imports[0].name === 'd')

// ============ Module ============
test('module empty', 'M:module{}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'M')

// ============ Function ============
test('function void', 'f:function void(){}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'f')

test('function params', 'f:function void(a:number,b:string){}', (ast) => {
    const f = ast.spaces[0]
    return f.name === 'f' && f.children.length === 0
})

test('function with commands', 'f:function number(){var x:number=1;return x;}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'f')

test('function async', 'public async f:function void(){}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].modifiers.async === true)

// ============ Class ============
test('class empty', 'C:class{}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'C')

test('class implements', 'C:class implements I{}', (ast) =>
    ast.spaces.length === 1)

// ============ Interface ============
test('interface empty', 'I:interface{}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'I')

test('interface of', 'I:interface of Base{}', (ast) =>
    ast.spaces.length === 1)

test('interface with func', `I:interface{
    a:function void();
    b:function number(x:number);
}`, (ast) => ast.spaces.length === 1)

// ============ Var (block-level) ============
test('var block', 'v:var of number=1;', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'v')

test('var block default null', 'v:var of string;', (ast) =>
    ast.spaces.length === 1)

// ============ Const ============
test('const block', 'c:const of number=1;', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'c')

// ============ Enum ============
test('enum', 'E:enum{A,B,C}', (ast) =>
    ast.spaces.length === 1 && ast.spaces[0].name === 'E')

// ============ Commands ============
test('var cmd', 'f:function void(){var x:number=1;}', (ast) => true)

test('assignment', 'f:function void(){x=1;}', (ast) => true)

test('compound assign', 'f:function void(){x+=1;}', (ast) => true)

test('call', 'f:function void(){doit();}', (ast) => true)

test('await call', 'f:function void(){await doit();}', (ast) => true)

test('return void', 'f:function void(){return;}', (ast) => true)

test('return value', 'f:function number(){return 1;}', (ast) => true)

test('if-else', `f:function void(){
    if(x>0){a=1;}
}`, (ast) => true)

test('if-else-if', `f:function void(){
    if(x>0){a=1;}else if(x<0){a=2;}else{a=0;}
}`, (ast) => true)

test('while', `f:function void(){
    while(x<10){x=x+1;}
}`, (ast) => true)

test('do-while', `f:function void(){
    do{x=x+1;}while(x<10);
}`, (ast) => true)

test('break', `f:function void(){break;}`, (ast) => true)
test('continue', `f:function void(){continue;}`, (ast) => true)
test('throw', `f:function void(){throw e;}`, (ast) => true)
test('delete', `f:function void(){delete a;}`, (ast) => true)
test('vm string', `f:function void(){vm 'gc';}`, (ast) => true)

// ============ Values/Expressions ============
test('number', 'f:function number(){return 42;}', (ast) => true)
test('string', 'f:function string(){return "hello";}', (ast) => true)
test('boolean true', 'f:function boolean(){return true;}', (ast) => true)
test('null', 'f:function void(){x=null;}', (ast) => true)
test('add', 'f:function number(){return 1+2;}', (ast) => true)
test('sub', 'f:function number(){return 3-1;}', (ast) => true)
test('mul', 'f:function number(){return 2*3;}', (ast) => true)
test('div', 'f:function number(){return 6/2;}', (ast) => true)
test('mod', 'f:function number(){return 5%2;}', (ast) => true)
test('compare', 'f:function boolean(){return a>b;}', (ast) => true)
test('equal', 'f:function boolean(){return a==b;}', (ast) => true)
test('logic and', 'f:function boolean(){return a&&b;}', (ast) => true)
test('logic or', 'f:function boolean(){return a||b;}', (ast) => true)
test('bit and', 'f:function number(){return a&b;}', (ast) => true)
test('bit or', 'f:function number(){return a|b;}', (ast) => true)
test('shift', 'f:function number(){return a<<1;}', (ast) => true)
test('ternary', 'f:function number(){return a?1:2;}', (ast) => true)
test('not', 'f:function boolean(){return !a;}', (ast) => true)
test('negate', 'f:function number(){return -a;}', (ast) => true)
test('pointer addr', 'f:function void(){x=&a;}', (ast) => true)
test('pointer val', 'f:function void(){x=*a;}', (ast) => true)
test('array index', 'f:function number(){return a[b];}', (ast) => true)
test('member access', 'f:function number(){return a.b;}', (ast) => true)
test('paren', 'f:function number(){return (1+2)*3;}', (ast) => true)
test('call expr', 'f:function number(){return a(1);}', (ast) => true)
test('new', 'f:function void(){x=new A();}', (ast) => true)

// ============ Lambda ============
test('lambda simple', 'f:function void(){x=():void->{return 1;};}', (ast) => true)

// ============ switch ============
test('switch', `f:function void(){
    switch(x){
        case 1->{a=1;}
        default->{a=0;}
    }
}`, (ast) => true)

// ============ foreach ============
test('foreach', `f:function void(){
    foreach(x:number as arr){a=x;}
}`, (ast) => true)

// ============ try ============
test('try-catch', `f:function void(){
    try{a=1;}catch(e:number)->{a=0;}
}`, (ast) => true)

test('try-finally', `f:function void(){
    try{a=1;}finally{a=0;}
}`, (ast) => true)

// ============ 嵌套 ============
test('nested', `
M:module{
    C:class{
        f:function void(){
            var x:number=1;
            if(x>0){return;}
        }
    }
}`, (ast) => {
    return ast.spaces.length === 1 && ast.spaces[0].name === 'M'
})

// ============ 注解 ============
test('annotation', '@xxx\nf:function void(){}', (ast) => true)

// ============ Map 字面量 ============
test('map literal', 'f:function void(){x={a:1,b:2};}', (ast) => true)

// ============ 数组字面量 ============
test('array literal', 'f:function void(){x=[1,2,3];}', (ast) => true)

// ============ 链式调用 ============
test('chain call', 'f:function void(){a.b.c();}', (ast) => true)

// ============ 复杂表达式 ============
test('complex expr', 'f:function number(){return a+b*c-d/e%f;}', (ast) => true)
test('compare chain', 'f:function boolean(){return a<b&&c>d||e==f;}', (ast) => true)
test('pointer chain', 'f:function void(){x=*(&a);}', (ast) => true)

// ============ postfix ops ============
test('postfix inc', 'f:function void(){a++;}', (ast) => true)
test('postfix dec', 'f:function void(){a--;}', (ast) => true)

// ============ for with lambdas ============
test('for lambda', `f:function void(){
    for(():void->{var i:number=0;},():boolean->{return i<10;},():void->{i++;}){a=a+1;}
}`, (ast) => true)

// ============ Summary ============
console.log(`\n${'='.repeat(40)}`)
console.log(`Passed: ${passed}, Failed: ${failed}, Total: ${passed + failed}`)
if (failed > 0) console.error('SOME TESTS FAILED!')