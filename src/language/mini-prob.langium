grammar MiniProb

entry Program:
    (declarations+=Decl ';')* functions+=Func+;

Decl:
    type=Type names+=ID (',' names+=ID)*;

Func: //main no params (in backend validate)
    name=ID '(' params=ParamList? ')' '{'
        (declarations+=Decl ';')*
        body=Block
    '}';
FuncCall:
    ref=[Func:ID] '(' ArgList? ')';

Block:
    statements+=Stmt+;

Stmt:
    ( Assignment | Query | Observation | FuncCall | 'throw') ';' | IfThenElse | While | TryCatch;

Lval: // maybe infer array type and nonarray (also in scoping)
    ref=[Decl:ID] ('['index=Expression']')?;

IfThenElse:
    'if' '(' condition=Expression ')' '{' thenBlock=Block '}' 'else' '{' elseBlock=Block '}';
While:
    'while' '(' condition=Expression ')' '{' whileBlock=Block '}';
TryCatch:
    'try' '{' tryBlock=Block '}' 'catch' '{' catchBlock=Block '}';
Assignment:
    leftValue=Lval '=' (distribution=Distribution | expression=Expression);
Observation:
    'observe' condition=Expression;
Query:
    'query' FuncCall;

ParamList:
    parameters+=Param (',' parameters+=Param)*;
Param:
    type=Type byRef?='&'? name=ID;
ArgList:
    arguments+=Arg (',' arguments+=Arg)*;
Arg:
    expression=Expression; //only expre and no ref symbol

Distribution:
    (name='Bernoulli' '(' p=Expression ',' q=Expression ')') |
    (name='Uniform' '(' lower=Expression ',' upper=Expression ')');
ProbChoice:
    '{'Expression ':' Expression '}';

Expression:
    LogicalOr ({infer ProbabilisticAssignment} (probabilities+=(ProbChoice) fallbacks+=LogicalOr)* );
LogicalOr infers Expression:
    LogicalAnd ({infer BinaryExpression.left=current} operator='||' right+=LogicalAnd)*;
LogicalAnd infers Expression:
    Comparison ({infer BinaryExpression.left=current} operator='&&' right+=Comparison)*;
Comparison infers Expression:
    Term ({infer BinaryExpression.left=current} operator=('<' | '<=' | '>' | '>=' | '==' | '!=') right+=Term)*;
Term infers Expression:
    Factor ({infer BinaryExpression.left=current} operator=('+' | '-') right+=Factor)*;
Factor infers Expression:
    Division ({infer BinaryExpression.left=current} operator=('*') right+=Division)*;
Division infers Expression:
    Unary ({infer BinaryExpression.left=current} operator=('/' | '%') right+=Unary)*;
Unary infers Expression:
    ({infer LogicalNegation} operator=('!') operand=Unary) | Primary;
Primary infers Expression:
    {infer BoolLiteral} value=BOOL | 
    {infer IntLiteral} value=IntLiteral | //whitespace allowed fir intpreffix(catch in validation)
    leftValue=Lval |
    '(' Expression ')';


Type:
    'bool' | IntType;

IntType:
  prefix=INT_PREFIX ({infer IntArray} '[' size=INT ']')?;
IntLiteral:
    sign=('+' | '-')? value=INT suffix=INT_PREFIX;

terminal INT_PREFIX: /[su][1-9][0-9]{0,8}/; // 2^29-1 backend
terminal BOOL returns boolean: /(true|false)/;
terminal ID: /(?!(true|false)|[su][1-9][0-9]*)[a-zA-Z_][a-zA-Z0-9_\.\:\~]*/;
terminal INT returns number: /[0-9]+/;
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;