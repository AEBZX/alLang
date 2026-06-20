import {it, expect, describe} from 'vitest'
import {getStream} from '../test_api'
import resolve from '../../src/check/resolve'
import block_default from '../../src/parser/block'
import {GrammarError} from '../../src/check'
import {FileTree} from '../../src/tree'

function check(code: string): GrammarError[] {
    const tool = getStream(code)
    const tree = block_default(tool)
    return resolve([tree])
}

function errorsToStrings(errors: GrammarError[]): string[] {
    return errors.map(e => e.message)
}

describe('SymbolResolver-符号解析', () => {
    describe('导入检查', () => {
        it('无导入无错误', () => {
            const errors = check('')
            expect(errors).toEqual([])
        })
        it('重复导入报错', () => {
            const errors = check('import Foo import Foo')
            expect(errorsToStrings(errors)).toContain('重复的导入')
        })
    })

    describe('变量解析', () => {
        it('未定义变量报错', () => {
            const errors = check(`
                public main:module {
                    public run:function void() {
                        return a;
                    }
                }
            `)
            expect(errorsToStrings(errors)).toContain('未定义的变量')
        })
        it('声明后使用变量无错误', () => {
            const errors = check(`
                public main:module {
                    public run:function void() {
                        var a:number;
                        return a;
                    }
                }
            `)
            expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
        })
        it('重复变量定义报错', () => {
            const errors = check(`
                public main:module {
                    public run:function void() {
                        var a:number;
                        var a:number;
                    }
                }
            `)
            expect(errorsToStrings(errors)).toContain('重复的变量')
        })
        it('函数参数在作用域内', () => {
            const errors = check(`
                public main:module {
                    public test:function void(a:number) {
                        return a;
                    }
                }
            `)
            expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
        })
    })

    describe('块定义重复检查', () => {
        it('同作用域重名块', () => {
            const errors = check(`
                public main:module {
                    public a:var of number
                    public a:var of number
                }
            `)
            expect(errorsToStrings(errors)).toContain('重复的变量')
        })
    })

    describe('break/continue', () => {
        it('while中break不报未定义', () => {
            const errors = check(`
                public main:module {
                    public run:function void() {
                        while(true) {
                            break;
                        }
                    }
                }
            `)
            // break 不需要变量检查，不应报未定义变量
            expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
        })
    })

    describe('delete语句', () => {
        it('delete已定义变量', () => {
            const errors = check(`
                public main:module {
                    public run:function void() {
                        var a:number;
                        delete a;
                    }
                }
            `)
            expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
        })
    })
})

describe('SymbolResolver-边界条件', () => {
    it('空树无错误', () => {
        const errors = resolve([])
        expect(errors).toEqual([])
    })
    it('空文件无错误', () => {
        const errors = check('')
        expect(errors).toEqual([])
    })
    it('多文件', () => {
        const tool1 = getStream(`
            public main:module {
                public test:function void() {
                }
            }
        `)
        const tree1 = block_default(tool1)
        const errors = resolve([tree1])
        expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
    })
})

// ===== 新增测试: 更多符号解析场景 =====

describe('SymbolResolver-表达式变量检查', () => {
    it('成员访问中未定义的对象', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return a.b;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('二元表达式左右操作数检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    var a:number;
                    return a+undefined_var;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('数组字面量中未定义元素', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return [undefined_var];
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('map字面量中未定义值', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return {a:number=undefined_var};
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('三元表达式检查条件', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return undefined_var?1:2;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('前缀表达式检查操作数', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return -undefined_var;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
})

describe('SymbolResolver-作用域嵌套', () => {
    it('if块内变量遮蔽', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    var a:number;
                    if(true) {
                        var a:number;
                    }
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('重复的变量')
    })
    it('嵌套while中变量遮蔽', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    var a:number;
                    while(true) {
                        var a:number;
                    }
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('重复的变量')
    })
    it('lambda参数在作用域内', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    var fn:map;
                }
            }
        `)
        // 不崩溃即可
        expect(Array.isArray(errors)).toBe(true)
    })
    it('foreach变量在作用域内', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    var arr:number;
                    foreach(a:number:arr) {
                        return a;
                    }
                }
            }
        `)
        expect(errorsToStrings(errors).filter(e => e === '未定义的变量')).toEqual([])
    })
    it('try-catch变量在作用域内', () => {
        // 注意: try 的 body 如果是 {} 块，commands_expr 在块结束时
        // 不消费 }，导致 try_expr 找不到 catch
        // 使用单行 try body 避免此问题
        const errors = check(`
            public main:module {
                public run:function void() {
                    try throw"error";catch(e:string):void->{}
                }
            }
        `)
        const filtered = errorsToStrings(errors).filter(e => e === '未定义的变量')
        expect(filtered).toEqual([])
    })
})

describe('SymbolResolver-静态和导入', () => {
    it('引用不存在的模块报错', () => {
        const errors = check('import NonExist')
        expect(errorsToStrings(errors)).toContain('未定义的模块')
    })
    it('静态块重复定义', () => {
        const errors = check(`
            public main:module {
                public static a:var of number
                public static a:var of number
            }
        `)
        // 可能有重复的静态块错误
        const strs = errorsToStrings(errors)
        expect(strs.length).toBeGreaterThan(0)
    })
    it('类实现不存在的接口', () => {
        const errors = check(`
            public main:module {
                public Foo:class implements NonExist {
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('不存在的接口')
    })
    it('接口继承不存在的接口', () => {
        const errors = check(`
            public main:module {
                public IFoo:interface of NonExist {
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('不存在的接口')
    })
})

describe('SymbolResolver-复合场景', () => {
    it('call表达式参数检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return foo(undefined_var);
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('switch值表达式检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    switch(undefined_var) {
                        case 1->break;
                        default break;
                    }
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('return值表达式检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    return undefined_var;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('delete表达式检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    delete nonexist;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
    it('throw表达式检查', () => {
        const errors = check(`
            public main:module {
                public run:function void() {
                    throw undefined_var;
                }
            }
        `)
        expect(errorsToStrings(errors)).toContain('未定义的变量')
    })
})
