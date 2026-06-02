/**
 * desugar 入口 — 接受 file_tree[] 返回合并后的 file_tree
 * 用法: desugar(files: file_tree[]): file_tree
 */
import {file_tree} from '../tree'
import {desugarAll} from './transform'

export function desugar(files: file_tree[]): file_tree {
    return desugarAll(files)
}

export {desugarAll} from './transform'