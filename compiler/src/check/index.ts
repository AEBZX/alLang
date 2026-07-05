import block_visitor from './block'
import {FileTree} from '../tree'
import {Scope} from './lib'
export default function (tree:FileTree[]){
    block_visitor.error=[]
    block_visitor.scope=new Scope(null)
    block_visitor.file_scope=new Scope(null)
    block_visitor.global_scope=new Scope(null)
    tree.forEach((file)=>{
        block_visitor.visit(file)
    })
    return block_visitor
}