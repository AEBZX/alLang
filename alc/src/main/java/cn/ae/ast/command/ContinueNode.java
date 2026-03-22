package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;

public class ContinueNode extends CommandNode {
    protected ContinueNode() {
    }
    public static ContinueNode create(){
        return new ContinueNode();
    }
}
