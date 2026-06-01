import {token, token_type} from '../pre'

// 匹配结果
interface MatchResult {
    mth: boolean
    tokens: token | Tree | (token | Tree)[] | null
}

// 令牌流 — 支持位置保存和恢复，实现回溯
class TokenStream {
    tk: token[]
    index: number

    constructor(tokens: token[]) {
        this.tk = tokens
        this.index = 0
    }

    now(): token | null {
        return this.index < this.tk.length ? this.tk[this.index] : null
    }

    peek(offset: number = 1): token | null {
        const i = this.index + offset
        return i >= 0 && i < this.tk.length ? this.tk[i] : null
    }

    next(): token | null {
        const t = this.now()
        if (t) this.index++
        return t
    }

    save(): number {
        return this.index
    }

    restore(pos: number) {
        this.index = pos
    }

    hasMore(): boolean {
        return this.index < this.tk.length
    }
}

class Tree {
    constructor() {
    }
}

class Match {
    ts: TokenStream

    constructor(ts: TokenStream) {
        this.ts = ts
    }

    match(): MatchResult {
        return {mth: false, tokens: null}
    }
}

// 匹配特定名称的token
class tokenNameMatch extends Match {
    name: string

    constructor(ts: TokenStream, name: string) {
        super(ts)
        this.name = name
    }

    match(): MatchResult {
        const pos = this.ts.save()
        const t = this.ts.now()
        if (t && t.name === this.name) {
            this.ts.next()
            return {mth: true, tokens: t}
        }
        this.ts.restore(pos)
        return {mth: false, tokens: null}
    }
}

// 匹配特定类型的token
class tokenTypeMatch extends Match {
    type: token_type

    constructor(ts: TokenStream, type: token_type) {
        super(ts)
        this.type = type
    }

    match(): MatchResult {
        const pos = this.ts.save()
        const t = this.ts.now()
        if (t && t.type === this.type) {
            this.ts.next()
            return {mth: true, tokens: t}
        }
        this.ts.restore(pos)
        return {mth: false, tokens: null}
    }
}

// 可选匹配 — 始终成功
class chooseMatch extends Match {
    _match: Match

    constructor(ts: TokenStream, match: Match) {
        super(ts)
        this._match = match
    }

    match(): MatchResult {
        const result = this._match.match()
        return {mth: true, tokens: result.mth ? result.tokens : null}
    }
}

// 或匹配 — 尝试每个分支直到成功
class orMatch extends Match {
    _match: Match[]

    constructor(ts: TokenStream, ...match: Match[]) {
        super(ts)
        this._match = match
    }

    match(): MatchResult {
        for (let i = 0; i < this._match.length; i++) {
            const result = this._match[i].match()
            if (result.mth) {
                return result
            }
        }
        return {mth: false, tokens: null}
    }
}

// 顺序匹配 — 所有子匹配必须成功
class sequenceMatch extends Match {
    _match: Match[]
    _to: (t: (token | Tree)[]) => (token | Tree)

    constructor(ts: TokenStream, to: (t: (token | Tree)[]) => (token | Tree), ...match: Match[]) {
        super(ts)
        this._match = match
        this._to = to
    }

    match(): MatchResult {
        const pos = this.ts.save()
        const tokens: (token | Tree)[] = []
        for (let i = 0; i < this._match.length; i++) {
            const result = this._match[i].match()
            if (!result.mth) {
                this.ts.restore(pos)
                return {mth: false, tokens: null}
            }
            tokens.push(result.tokens)
        }
        return {mth: true, tokens: this._to(tokens)}
    }
}

// 循环匹配 — 零次或多次
class loopMatch extends Match {
    _match: Match
    _to: (t: (token | Tree)[]) => (token | Tree)

    constructor(ts: TokenStream, to: (t: (token | Tree)[]) => (token | Tree), match: Match) {
        super(ts)
        this._match = match
        this._to = to
    }

    match(): MatchResult {
        const tokens: (token | Tree)[] = []
        while (true) {
            const result = this._match.match()
            if (!result.mth) break
            tokens.push(result.tokens)
        }
        return {mth: true, tokens: this._to(tokens)}
    }
}

// 带分隔符的循环匹配 — 一次或多次
class whileMatch extends Match {
    _match: Match
    _to: (t: (token | Tree)[]) => (token | Tree)
    _space: Match

    constructor(ts: TokenStream, to: (t: (token | Tree)[]) => (token | Tree), match: Match, space: Match) {
        super(ts)
        this._match = match
        this._to = to
        this._space = space
    }

    match(): MatchResult {
        const pos = this.ts.save()
        const tokens: (token | Tree)[] = []
        // 必须有至少一个
        const first = this._match.match()
        if (!first.mth) {
            this.ts.restore(pos)
            return {mth: false, tokens: null}
        }
        tokens.push(first.tokens)
        // 后续由分隔符引导
        while (true) {
            const s = this._space.match()
            if (!s.mth) break
            const next = this._match.match()
            if (!next.mth) {
                this.ts.restore(pos)
                return {mth: false, tokens: null}
            }
            tokens.push(next.tokens)
        }
        return {mth: true, tokens: this._to(tokens)}
    }
}

// 直到匹配 — 重复直到终止符
class untilMatch extends Match {
    _match: Match
    _end: Match
    _to: (t: (token | Tree)[]) => (token | Tree)

    constructor(ts: TokenStream, to: (t: (token | Tree)[]) => (token | Tree), match: Match, end: Match) {
        super(ts)
        this._match = match
        this._end = end
        this._to = to
    }

    match(): MatchResult {
        const tokens: (token | Tree)[] = []
        while (true) {
            const e = this._end.match()
            if (e.mth) break
            const result = this._match.match()
            if (!result.mth) break
            tokens.push(result.tokens)
        }
        return {mth: true, tokens: this._to(tokens)}
    }
}

// 分隔符循环（零次或多次） — 如 `a, b, c`
class sepByMatch extends Match {
    _match: Match
    _sep: Match
    _to: (t: (token | Tree)[]) => (token | Tree)

    constructor(ts: TokenStream, to: (t: (token | Tree)[]) => (token | Tree), match: Match, sep: Match) {
        super(ts)
        this._match = match
        this._sep = sep
        this._to = to
    }

    match(): MatchResult {
        const tokens: (token | Tree)[] = []
        const first = this._match.match()
        if (!first.mth) {
            return {mth: true, tokens: this._to(tokens)}
        }
        tokens.push(first.tokens)
        while (true) {
            const pos = this.ts.save()
            const s = this._sep.match()
            if (!s.mth) {
                this.ts.restore(pos)
                break
            }
            const next = this._match.match()
            if (!next.mth) {
                this.ts.restore(pos)
                break
            }
            tokens.push(next.tokens)
        }
        return {mth: true, tokens: this._to(tokens)}
    }
}

export {
    Tree,
    TokenStream,
    Match,
    MatchResult,
    chooseMatch,
    orMatch,
    loopMatch,
    sequenceMatch,
    whileMatch,
    untilMatch,
    sepByMatch,
    tokenTypeMatch,
    tokenNameMatch
}