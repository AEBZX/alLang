/**
 * create 入口 — 将 desugar 后的 file_tree 转换为 ALVM 字节码 command_data
 *
 * 用法:
 *   import { create } from './create'
 *   const data = create(desugaredFileTree)
 *
 * 返回 command_data { HEAD: head_alloc[], BODY: { [blockName: string]: instruction[][] } }
 */
import {file_tree} from '../tree'
import {command_data} from './types'
import {generate} from './generator'

export function create(file: file_tree): command_data {
    return generate(file)
}

export {command_data, VarAllocator} from './types'
export type {head_alloc, instruction, block, body_map} from './types'
