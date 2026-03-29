package cn.ae.ast.model.init.block;

import cn.ae.ast.build.parser.Decorator;
import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.init.var.VarNode;
import cn.ae.ast.model.magic.DecoratorNode;
import cn.ae.ast.types.Type;

import java.util.ArrayList;
import java.util.List;

public class FuncNode extends ListNode {
    public Type RetType;
    public List<VarNode> params;
    public List<DecoratorNode> decorator;
    public List<Decorator> _decorators;
    public String name;
    public boolean async;
    public boolean _public=false;
    public boolean _static=false;
    public boolean _final=false;
    protected FuncNode(List<CommandNode> commands, Type RetType, List<VarNode> params, List<Decorator> decorator, String name, boolean async) {
        super(commands);
        this.RetType = RetType;
        this.params = params;
        this.name = name;
        this._decorators = decorator;
        this.async = async;
        _decorators=new ArrayList<>();
    }

    public static FuncNode create(List<CommandNode> commands, Type RetType, List<VarNode> params, List<Decorator> decorator, String name, boolean async) {
        return new FuncNode(commands, RetType, params,decorator, name, async);
    }
}
