# Allang vm
## 简介
这是一个vm
## 使用方法
```shell
allang-vm run 虚拟机文件.albin
```
## alasm格式
### 头格式
allang-vm接受栈,以及变量的头
```
STACK_LIST:栈1,栈2,栈3...
VAR_LIST:变量1,变量2,变量3...
```
举例子:
```
STACK_LIST[a:id,b:id,c:id]
VAR_LIST:a,b,c
```
### 注释
```
#我是注释
```
就这么简单
### 指令集
值格式:数字/变量名,特殊写法{变量名},拿到变量的地址
以下用{value}代替
1. mov {value} {value}
2. push 栈value {value}
3. pop 栈value 变量名
4. add {value} {value}
5. sub {value} {value}
6. mul {value} {value}
7. div {value} {value}
8. mod {value} {value}
9. and {value} {value}
10. or {value} {value}
11. xor {value} {value}
12. not {value}
13. shr {value} {value}
14. shl {value} {value}
15. cmp {value} {value} 比较符(>=,=等)
16. call 块名
17. cz 块名
18. ret
19. in {value}
20. out {value}
21. flush
### 特殊语法
1. HEAD_START ID
2. HEAD_END
3. gc
### 举个栗子
```alasm
STACK_LIST[a:1,b:2,c:3]
VAR_LIST:a,b,c
HEAD_START main
push a 1
push b 1
call abc
HEAD_END
HEAD_START abc
pop a a
pop b b
cmp a b !=
cz efg
ret
HEAD_END
HEAD_START efg
add a b
HEAD_END
```
## IO API
### FILE API
```alasm
#FILE标识为0
in 0
#可以多个变量
in 文件名ASCII码
in 0读1写
#写模式需要追加的
in UNICODE
...
#读模式要注意的
#读取8个字节
out value
#啥时候读到EOF啥时候结束
flush
```
### 输入输出 API