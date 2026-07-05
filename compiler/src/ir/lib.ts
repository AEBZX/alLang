import {CommandTree} from '../tree'
export class IRFactory{
    uuid:number
    name(){
        return this.uuid++
    }
    Block:Map<number,Block>
    constructor() {
        this.uuid=0
        this.Block=new Map<number, Block>()
    }
    create(data:Command[]):number{
        let id=this.name()
        this.Block.set(id,new Block(id,data))
        return id
    }
}
export class Block{
    constructor(name:number,public commands:Command[]) {
    }
}
export class Command{
    constructor(public id:CommandType,public args1:number,public args2:number) {
    }
}
export enum CommandType{
    MOV_V,MOV_I,
    LOAD,ADD,SUB,MUL,DIV,MOD,
    AND,OR,XOR,SHL,SHR,
    CMP_I_I,CMP_V_I,CMP_V_V,CMP_I_V,
    CALL,CZ,RET,PUSH_V,PUSH_I,POP_V,POP_I,
    IN_I,IN_V,OUT_V,THR_CALL,THR_CZ
}