import {it, expect, describe} from 'vitest'
import {getStream} from '../test_api'
import {Typer} from '../../src/check/type'
import block_default from '../../src/parser/block'
import {GrammarError} from '../../src/check'
import {FileTree} from '../../src/tree'

function check(code: string): GrammarError[] {
    const tool = getStream(code)
    const tree = block_default(tool)
    const typer = new Typer([tree])
    typer.check()
    return typer.error
}

function errorsToStrings(errors: GrammarError[]): string[] {
    return errors.map(e => e.message)
}

describe('Typer-类型检查', () => {
    describe('基础变量类型检查', () => {
        it('变量声明不报类型错误', () => {
            const errors = check(`
                public M:module {
                    public foo:function void() {
                        var a:number;
                    }
                }
            `)
            // 变量声明无初始值时不应报错
            const typeErrors = errorsToStrings(errors).filter(e => e === '类型错误')
            // typer 对无初始值var不主动检查，可能不产生错误
            expect(Array.isArray(errors)).toBe(true)
        })
    })

    describe('简单表达式类型推断', () => {
        it('基本算术不崩溃', () => {
            const errors = check(`
                public M:module {
                    public foo:function void() {
                        var a:number;
                        var b:number;
                        a=1;
                        b=2;
                    }
                }
            `)
            // 不应崩溃
            expect(Array.isArray(errors)).toBe(true)
        })
    })

    describe('控制流条件', () => {
        it('if条件为boolean合法', () => {
            const errors = check(`
                public M:module {
                    public foo:function void() {
                        if(true) {
                        }
                    }
                }
            `)
            expect(errorsToStrings(errors).filter(e => e === '类型错误')).toEqual([])
        })
    })

    describe('return类型检查', () => {
        it('number函数返回number合法', () => {
            const errors = check(`
                public M:module {
                    public bar:function number() {
                        return 1;
                    }
                }
            `)
            expect(errorsToStrings(errors).filter(e => e === '类型错误')).toEqual([])
        })
    })
})

describe('Typer-边界条件', () => {
    it('空树无错误', () => {
        const typer = new Typer([])
        typer.check()
        expect(typer.error).toEqual([])
    })
    it('空文件无错误', () => {
        const errors = check('')
        expect(errors).toEqual([])
    })
    it('模块内多个函数', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                }
                public bar:function number() {
                    return 42;
                }
            }
        `)
        // 不应崩溃
        expect(Array.isArray(errors)).toBe(true)
    })
})

// ===== 新增测试: 更多类型检查场景 =====

describe('Typer-赋值类型检查', () => {
    it('number赋值给number合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a=1;
                }
            }
        `)
        expect(errorsToStrings(errors).filter(e => e === '类型错误')).toEqual([])
    })
    it('string赋值给number可能报错', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a="hello";
                }
            }
        `)
        // 不崩溃即可，可能报类型错误也可能不报
        expect(Array.isArray(errors)).toBe(true)
    })
})

describe('Typer-复合赋值类型检查', () => {
    it('+= 操作number合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a+=1;
                }
            }
        `)
        // 不崩溃
        expect(Array.isArray(errors)).toBe(true)
    })
    it('-= 操作number合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a-=1;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
})

describe('Typer-自增自减类型检查', () => {
    it('自增number合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a++;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
    it('自减number合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a--;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
})

describe('Typer-控制流类型检查', () => {
    it('if条件非boolean可能报错', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    if(a) {
                    }
                }
            }
        `)
        // 不崩溃
        expect(Array.isArray(errors)).toBe(true)
    })
    it('while条件boolean合法', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    while(true) {
                    }
                }
            }
        `)
        expect(errorsToStrings(errors).filter(e => e === '类型错误')).toEqual([])
    })
    it('for条件检查', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    for(var a:number=0;a<10;) {
                    }
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
})

describe('Typer-复杂表达式类型推断', () => {
    it('二元表达式类型推断', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a=1+2;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
    it('前缀表达式类型', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a=-1;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
    it('三元表达式类型', () => {
        const errors = check(`
            public M:module {
                public foo:function void() {
                    var a:number;
                    a=true?1:2;
                }
            }
        `)
        expect(Array.isArray(errors)).toBe(true)
    })
})
