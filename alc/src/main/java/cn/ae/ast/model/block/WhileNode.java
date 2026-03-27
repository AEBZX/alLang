package cn.ae.ast.model.block;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.get.BoolNode;

import java.util.List;

public class WhileNode  extends ListNode {
    public BoolNode condition;
    public boolean is_do;
    protected WhileNode(List<CommandNode> commands, BoolNode condition, boolean is_do) {
        super(commands);
        this.condition = condition;
        this.is_do = is_do;
    }
    public static WhileNode create(List<CommandNode> commands, BoolNode condition, boolean is_do) {
        return new WhileNode(commands, condition, is_do);
    }
}