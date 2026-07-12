import {FileTree} from '../tree'
export class IRFactory{
    tree:FileTree[]
    uuid:number
    name(){
        return this.uuid++
    }
    Scope:Scope
    Block:Map<number, Block>
    Pool:ValuePool
    cache:Command[]
    constructor(tree:FileTree[],public call:(data:FileTree[],Factory:IRFactory)=>void) {
        this.uuid=0
        this.tree=tree
        this.Block=new Map<number, Block>()
        this.Scope=new Scope(null)
        this.Pool=new ValuePool()
        this.cache=[]
    }
    run(){
        this.call(this.tree,this)
        return this.Block
    }
    create():number{
        let id=this.name()
        this.Block.set(id,new Block(id,this.cache))
        return id
    }
}
export class ValuePool{
    pool:Map<string|number,number>
    constructor() {
        this.uuid=0
        this.pool=new Map<string|number, number>()
    }
    uuid:number
    get(id:string|number):number{
        if(!this.pool.has(id))
            this.pool.set(id,this.uuid++)
        return this.pool.get(id)
    }
}
export class Scope{
    block:Map<string,number>
    iden:Map<string,number>
    constructor(public parent:Scope|null) {
        this.block=new Map<string, number>()
        this.iden=new Map<string, number>()
    }
    enter(){
        return new Scope(this)
    }
    leave(){
        return this.parent
    }
    lookup_iden(name:string){
        return this.iden.get(name) || this.parent?.lookup_iden(name)
    }
    lookup_block(name:string){
        return this.block.get(name) || this.parent?.lookup_block(name)
    }
    assign_block(name:string,id:number){
        this.block.set(name,id)
    }
    assign_iden(name:string,id:number){
        this.iden.set(name,id)
    }
}
export class Block{
    constructor(name:number,public commands:Command[]) {
    }
}
export class Command{
    constructor(public id:CommandType,public args1:number,public args2:number,public args3:number) {
    }
}
export enum CommandType{
    LOAD_POOL,LOAD_REG,MOV,MOVM,MOVA,JMP,JMP_R,CALL,CALL_R,CFT,CFT_R
    ,RET,CMP,ADD,SUB,MUL,DIV,MOD,AND,OR,XOR,SHL,SHR,
    NOT,IN,OUT,PUSH,POP,MOV_R,MOVM_R,MOVA_R
}
export class Bool{
    static equal=1
    static not_equal=2
    static less=3
    static less_equal=4
    static greater=5
    static greater_equal=6
}