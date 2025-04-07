grammar MiniProb

entry Program:
    (declarations+=Decl ';')* functions+=Func+;

Decl:
    type=Type names+=ID (',' names+=ID)*;

Func:
    name=ID '(' params=ParamList? ')' '{'
        (declarations+=Decl ';')*
        body=Block
    '}';
FuncCall:
    ref=ID '(' ArgList ')';

Block:
    statements+=Stmt+;

Stmt:
    (Assignment | Query | Observation) ';' | IfThenElse | While;


Assignment:
    leftValue=Lval '=' (expression=Expression | distribution=Distribution | probabilityAssingment=ProbAssign);
Observation:
    'observe' '(' truthValue=Expression ')';
Query:
    'query' FuncCall;
IfThenElse:
    'if' '(' condition=Expression ')' '{' thenBlock=Block '}' ('else' '{' elseBlock=Block '}')?;
While:
    'while' '(' condition=Expression ')' '{' whileBlock=Block '}';

ParamList:
    parameters+=Param (',' parameters+=Param)*;
Param:
    type=Type byRef?='&'? name=ID;
ArgList:
    arguments+=Arg (',' arguments+=Arg)*;
Arg:
    nyRef?='&'? ref=ID;

Lval:
    ref=ID ('['index=Expression']')?;

Distribution:
    (name='Bernoulli' '(' p=Expression ',' q=Expression ')') |
    (name='Uniform' '(' lower=Expression ',' upper=Expression ')');

ProbAssign:
    choices+=ProbChoice+ fallback=Expression;
ProbChoice:
    result=Expression probabilty='{'Expression ':' Expression '}';

Expression:
    LogicalOr;
LogicalOr infers Expression:
    LogicalAnd ({infer BinaryExpression.left=current} operator='||' right+=LogicalAnd)*;
LogicalAnd infers Expression:
    Equality ({infer BinaryExpression.left=current} operator='&&' right+=Equality)*;
Equality infers Expression:
    Comparison ({infer BinaryExpression.left=current} operator=('==' | '!=') right+=Comparison)*;
Comparison infers Expression:
    Term ({infer BinaryExpression.left=current} operator=('<' | '<=' | '>' | '>=') right+=Term)*;
Term infers Expression:
    Factor ({infer BinaryExpression.left=current} operator=('+' | '-') right+=Factor)*;
Factor infers Expression:
    Unary ({infer BinaryExpression.left=current} operator=('*' | '/') right+=Unary)*;
Unary infers Expression:
    Primary | {infer UnaryExpression.operand=current} operator=('!' | '-');
Primary infers Expression:
    {infer BoolLiteral} value=BOOL | 
    {infer IntLiteral} value=INT |
    ref=Lval |
    '(' Expression ')';


Type:
    'bool' | IntType | IntArrayType;

IntType:
    prefix=INT_PREFIX;
IntArrayType:
  prefix=INT_PREFIX '[' size=INT ']';

terminal INT_PREFIX: /[su][1-9][0-9]*/;
terminal ID: /(?![su][1-9][0-9]*)[a-zA-Z_][a-zA-Z0-9_]*/;
terminal INT returns number: /[0-9]+/;
terminal BOOL: /[true|false]/;
hidden terminal WS: /\s+/;
hidden terminal BLOCKCOMMENT: /#{[\s\S]*}#/;
hidden terminal LINECOMMENT: /#.+/;