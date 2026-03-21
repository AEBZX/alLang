package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;

public class Continue extends CommandNode {
    protected Continue() {
    }
    public static Continue create(){
        return new Continue();
    }
}
