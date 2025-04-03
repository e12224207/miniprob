grammar MiniProb

entry Program:
    (declarations+=Decl ';')* functions+=Func+;

Decl:
    type=Type names+=ID (',' names+=ID)*;

Func:
    name=ID '(' params=ParamList ')' '{'
        // declarations+=Decl*
        // body=Block
    '}';

Type:
    'bool' | INT_PREFIX | IntArrayType;

IntArrayType:
  prefix=INT_PREFIX '[' size=INT ']';


ParamList:
    parameters+=Param (',' parameters+=Param)*;

Param:
    type=Type ref?='&'? name=ID;

terminal INT_PREFIX: /[su][1-9][0-9]*/;
terminal ID: /[a-zA-Z_][a-zA-Z0-9_]*/;
terminal INT returns number: /[0-9]+/;
hidden terminal WS: /\s+/;