package cn.ae.ast.model.command;

import cn.ae.ast.model.basic.CommandNode;

public class ContinueNode extends CommandNode {
    protected ContinueNode() {
    }
    public static ContinueNode create(){
        return new ContinueNode();
    }
}
