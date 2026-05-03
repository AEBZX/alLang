#include "vm.h"

void run(List<unsigned char> code)
{
    pool p =pool();
    var var_p=var(&p);
    Stack stack=Stack();
    Map<int,List<unsigned char>> block;
    //code遍历
    List<unsigned char> ls=List<unsigned char>();
    int name;
    //HEAD_START ID
    //HEAD_END
    for (int i = 0; i < code.size(); i++)
    {
        if (code[i]==BLOCK_START)
        {
        }
    }
}
