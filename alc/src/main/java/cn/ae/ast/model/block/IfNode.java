package cn.ae.ast.model.block;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.get.BoolNode;

import java.util.List;

public class IfNode extends ListNode {
    public BoolNode condition;
    public ListNode else_run;
    protected IfNode(List<CommandNode> commands, BoolNode condition,ListNode else_run) {
        super(commands);
        this.condition = condition;
        this.else_run = else_run;
    }
    public static IfNode create(List<CommandNode> commands, BoolNode condition, ListNode else_run) {
        return new IfNode(commands, condition, else_run);
    }
}
