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
    pool:Map<string,number>
    constructor() {
        this.uuid=0
        this.pool=new Map<string, number>()
    }
    uuid:number
    get(id:string):number{
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
    MOV_V_V,MOV_V_I,MOV_I_I,MOV_I_V,
    LOAD,ADD_V,SUB_V,MUL_V,DIV_V,MOD_V,
    AND_V,OR_V,XOR_V,SHL_V,SHR_V,
    ADD_I,SUB_I,MUL_I,DIV_I,MOD_I,
    AND_I,OR_I,XOR_I,SHL_I,SHR_I,
    CMP_I_I,CMP_V_I,CMP_V_V,CMP_I_V,
    CALL,CZ,RET,PUSH_V,PUSH_I,POP_V,POP_I,
    IN_I,IN_V,OUT_I,OUT_V,THR_CALL,THR_CZ,
    MOVA_V_V_V,MOVA_V_V_I,MOVA_V_I_I,MOVA_V_I_V,
    MOVA_I_V_V,MOVA_I_V_I,MOVA_I_I_I,MOVA_I_I_V,
    MOVC_V_I,MOVC_I_V,MOVC_I_I,MOVC_V_V,NOT_I,NOT_V,
    MOVR_V,MOVR_I
}
export class Bool{
    static equal=1
    static not_equal=2
    static less=3
    static less_equal=4
    static greater=5
    static greater_equal=6
}