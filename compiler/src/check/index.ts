/**
 * checker 入口 — 接受 file_tree[] 进行检查
 * 用法: check(files) — 输出错误/警告，不返回值
 */
import {file_tree} from '../tree'
import {ScopeBuilder} from './scope'
import {Validator, CheckResult} from './rules'

export function check(files: file_tree[]): void {
    const result = checkWithResult(files)
    // 仅输出，不返回
}

export function checkWithResult(files: file_tree[]): CheckResult {
    const builder = new ScopeBuilder()
    const rootScope = builder.build(files)

    const validator = new Validator(rootScope)
    const result = validator.validate()

    if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(result.report())
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
        console.log('检查通过，无错误，无警告')
    }

    if (result.errors.length > 0) {
        console.log(`\n共 ${result.errors.length} 个错误，${result.warnings.length} 个警告`)
    } else if (result.warnings.length > 0) {
        console.log(`\n共 ${result.warnings.length} 个警告`)
    }

    return result
}

export {ScopeBuilder, Validator, CheckResult}