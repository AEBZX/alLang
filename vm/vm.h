#ifndef ALLANG_VM_H
#define ALLANG_VM_H
#include <stack>
#include <string>
#include <vector>
#include <unordered_map>
#include<variant>
#include<unordered_set>
//以下宏为指令集ID
#define MOV 0
#define PUSH 1
#define POP 2
#define ADD 3
#define SUB 4
#define MUL 5
#define DIV 6
#define MOD 7
#define AND 8
#define OR 9
#define XOR 10
#define NOT 11
#define SHL 12
#define SHR 13
#define CALL 14
#define CZ 15
#define CMP 16
#define RET 17
#define LOOP 18
#define SYSCALL 19
#define BLOCK_START 20
#define BLOCK_END 21
#define DELETE 22
template<typename T>
using List=std::vector<T>;
template<typename K, typename V>
using Map=std::unordered_map<K,V>;
using Any=std::variant<long long,long double,std::string,bool>;
using Stack=std::stack<Any>;
template<typename K,typename V>
class KV
{
public:
    K key;
    V value;
    KV(K k,V v)
    {
        key=k;
        value=v;
    }
    KV()
    {
        key=K();
        value=V();
    }
    ~KV()
    = default;
};
class pool
{
public:
    Map<Any, KV<Any, int>> _pool;

    void gc()
    {
        for (auto it = _pool.begin(); it != _pool.end(); ) {
            if (it->second.value <= 0) {
                it = _pool.erase(it);
            } else {
                ++it;
            }
        }
    }

    const KV<Any, int>* link(Any data)
    {
        auto it = _pool.find(data);
        if (it != _pool.end()) {
            it->second.value++;
            return &(it->second);
        }

        // 不存在则创建
        auto& kv = _pool[data];
        kv.key = data;
        kv.value = 1;
        return &kv;
    }

    void unlink(Any data){
        auto it = _pool.find(data);
        if (it != _pool.end()) {
            it->second.value--;
            if (it->second.value <= 0) {
                _pool.erase(it);
            }
        }
    }
};
class var
{
public:
    Map<long long, Any*> data;
    pool* address;

    var(pool* p) : address(p) {}

    void del(long long id)
    {
        auto it = data.find(id);
        if (it != data.end()) {
            if (it->second != nullptr) {
                address->unlink(*it->second);
            }
            data.erase(it);
        }
    }
    void set(long long id, Any* value)
    {
        auto it = data.find(id);
        if (it != data.end()) {
            del(id);
        }
        data[id] = value;
        address->link(*value);
    }
};
#endif
