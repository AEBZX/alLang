# 基本类型
1. number:也就是一个64位double
2. string
3. void(仅函数):无
4. boolean
5. map,也就是一个hashmap
6. array,定义为type[],多维以此类推,如number[][][],string[]
7. lambda,定义为参数集->type
# 基本结构定义
1. 行变量,定义为名字:类型,如a:number
2. 参数集,定义为(行变量,行变量,...)或()
# 块机制
allang以如下格式定义块
```allang
//块
修饰符 名字:块定义
```
## allang允许的修饰符   
1. public/private:是否可在当前Scope之外访问,默认public
特殊规则:文件顶层自动填充public,忽略private
2. async/sync:是否异步,仅对函数有效,
非函数会被填充为sync,忽略async,函数默认为sync
3. static/unstatic:是否静态,仅对函数有效,非函数默认被填充为static,
函数默认被填充为unstatic
## allang支持的块
1. 函数,定义为function 类型名 参数集 代码集,
如function void(a:number){}
2. 类,定义为class implements 接口名 块集合,若无implements,默认填充为implements ObjectInterface,
如:class implements b{},class{}(本质为class implements ObjectInterface)
3. 接口,定义为interface of 接口名 块集合,若无则填充为ObjectInterface,
如interface of b{},interface{}(本质为interface of ObjectInterface)
4. 块变量,定义为var of 类型=值;例如var of number=1;,若无=默认填充为null,
如var of number=1;var of string;(本质为var of string=null;)
5. 块常量,定义为const of 类型=值;如const of number=1;
6. 模块,定义为module 块集合,例如module{}
7. 函数定义,定义为function 类型名 参数集;如function number(a:number);
若不在接口的块集合内,则填充为返回null,如上例会被填充为function number(a:number){return null}
8. 枚举,定义为enum{name1,name2,...},如enum{RED,BLUE,GREEN}

## 备注
块集合定义为:{块,块,...}如:
```allang
{
    public sync a:function void(){}
    private unstatic b:class implements c{}
}
```
# 命令
1. 变量定义:var 行变量;或var 行变量=值;如var a:number=1;var b;
2. 赋值:变量=值;
3. 调用:await? 函数名 参数调用;或者await? lambda变量名 参数调用;
如a();await b();
4. +=,-=,*=,/=等
5. continue,break
6. if-else,定义为
```allang
if condition 命令块
?else if condition 命令块
?else if condition 命令块
...
?else 命令块
```
7. switch,定义为
```allang
switch(命令){
    ?case 值->命令块
    ?case 值->命令块
    ...
    ?default->命令块
}
```
8. for循环,定义为
for(init lambda,condition lambda,setup lambda)命令块
如for(():void->{var i:number=0;},():boolean->{return i<10},():void->{i++}){}
9. while循环,定义为while condition 命令块,
如while(true){}
10. try-catch-finally,定义为
```allang
try 命令块
?catch lambda
?finally 命令块
如
try{}
catch (e:number)->{}
finally{}
```
11. return,定义为return ?值;如return;return 0;
12. vm,定义为vm string;如vm 'gc';
13. 命令块,定义为{命令,命令,...}
14. throw,定义为throw value;
15. do,while,定义为do 命令块 while condition
16. delete,定义为delete var_name;
## 备注
参数调用定义:(value,value,...)
condition定义:(value)
# 特殊前置
import定义为import a ?as b;如import a;import b as a;
# 值
1. 直接量,如'abc',10,10.2,null,true
2. 运算,如a+b,a-b,a&b,a==b
3. 下标,如array[0],map['abc']
4. 指针操作,如*a,&a
5. 括号表达式,如(a)
6. lambda表达式,定义为 参数集:类型->命令块
7. 函数调用,如a(1)
8. new调用,如new A()
9. 三元运算符,定义为value?value:value
10. 模块调用,如module.a
11. 以上的链式组合,如a.b.c.d
# map,array
赋值:map['xxx']='xxxx',map={xxx of type:xxx},array[id]=xxx,array=[xxx,xxx]