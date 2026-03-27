package cn.ae.ast.model.block;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.get.BoolNode;
import cn.ae.ast.types.Bool;

import java.util.HashMap;
import java.util.List;

public class SwitchNode extends ListNode{
    public HashMap<BoolNode,ListNode> case_table;
    public ListNode default_run;
    protected SwitchNode(GetNode value, List<GetNode> table, List<ListNode> table_run,ListNode default_run) {
        super(null);
        this.case_table = new HashMap<>();
        for (int i = 0; i < table.size(); i++) {
            this.case_table.put(BoolNode.create(value,table.get(i), Bool.is),table_run.get(i));
        }
        this.default_run = default_run;
    }
    public static SwitchNode create(GetNode value, List<GetNode> table, List<ListNode> table_run,ListNode default_run) {
        return new SwitchNode(value, table, table_run,default_run);
    }
}
