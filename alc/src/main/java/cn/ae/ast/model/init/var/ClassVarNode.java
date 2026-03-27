package cn.ae.ast.model.init.var;

import cn.ae.ast.model.magic.DecoratorNode;
import cn.ae.ast.types.Type;

import java.util.List;

public class ClassVarNode extends VarNode {
    public boolean _public;
    public boolean _static;
    public List<DecoratorNode> decorator;
    public String class_name;

    protected ClassVarNode(String name, Type type, String other, boolean unsigned, boolean pointer,
                           boolean _public, boolean _static, List<DecoratorNode> decorator, String class_name) {
        super(name, type, other, unsigned, pointer);
        this._public = _public;
        this._static = _static;
        this.class_name = class_name;
        this.decorator = decorator;
    }
    public static ClassVarNode create(String name, Type type, String other, boolean unsigned, boolean pointer,
                                      boolean _public, boolean _static, List<DecoratorNode> decorator, String class_name) {
        return new ClassVarNode(name, type, other, unsigned, pointer, _public, _static, decorator, class_name);
    }
}
