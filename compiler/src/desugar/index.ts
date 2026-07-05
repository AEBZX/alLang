import block from './block'
import {FileTree} from '../tree'
export default function (f:FileTree[]){
    f.forEach((file)=>{
        for(let j=0;j<file.block.length;j++)
            file.block[j]=block(file.block[j])
    })
    return f
}