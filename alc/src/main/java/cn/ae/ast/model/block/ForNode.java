package cn.ae.ast.model.block;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.command.SetNode;
import cn.ae.ast.model.get.BoolNode;
import cn.ae.ast.model.init.var.VarNode;

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
