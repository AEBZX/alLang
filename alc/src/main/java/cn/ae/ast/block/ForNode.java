package cn.ae.ast.block;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.basic.ListNode;
import cn.ae.ast.command.SetNode;
import cn.ae.ast.get.BoolNode;
import cn.ae.ast.get.MathNode;
import cn.ae.ast.init.var.VarNode;

import java.util.List;

public class ForNode extends ListNode {
    public VarNode init;
    public SetNode init_set;
    public BoolNode condition;
    public SetNode step;
    public static ForNode create(List<CommandNode> commands, VarNode init, SetNode init_set, BoolNode condition, SetNode step){
        return new ForNode(commands, init, init_set, condition, step);
    }
    protected ForNode(List<CommandNode> commands, VarNode init, SetNode init_set, BoolNode condition, SetNode step) {
        super(commands);
        this.init = init;
        this.init_set = init_set;
        this.condition = condition;
        this.step = step;
    }
}
