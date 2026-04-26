#ifndef ALLANG_VM_H
#define ALLANG_VM_H
#include "string"
enum value_type
{
    STRING,NUMBER,BOOLEAN
};
struct value
{
    value_type type;
    union
    {
        std::string str;
        long long num;
        bool boolean;
    };
};
class Map
{
};
#endif //ALLANG_VM_H
