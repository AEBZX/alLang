import {segment, word} from './pre'

/**
 * 测试用
 */
let a:word[]=[
    new word(';'),
    new word('if'),
    new word('else if')
]
console.log(new segment("12",a).segment())